"""
Quick Suite Backend API with Cognito Integration

This backend handles:
1. Cognito JWT token validation
2. User identity mapping to QuickSight
3. QuickSight embed URL generation

Deploy as:
- AWS Lambda + API Gateway (recommended)
- ECS/Fargate with FastAPI
- Any Python web framework

Required IAM permissions:
- quicksight:GenerateEmbedUrlForRegisteredUser
- quicksight:RegisterUser (if auto-provisioning users)
"""

import os
import json
import boto3
from functools import wraps
from datetime import datetime, timedelta

# FastAPI example (easily adaptable to Flask, Lambda, etc.)
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import jwt
from jwt import PyJWKClient

app = FastAPI(title="Quick Suite API")

# CORS for Chrome extension and hosted app
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "chrome-extension://*",
        "https://quicksuite.yourcompany.com",  # Your hosted app domain
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# CONFIGURATION
# ============================================================

# AWS Configuration
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")
AWS_ACCOUNT_ID = os.environ.get("AWS_ACCOUNT_ID")

# Cognito Configuration
COGNITO_USER_POOL_ID = os.environ.get("COGNITO_USER_POOL_ID")
COGNITO_APP_CLIENT_ID = os.environ.get("COGNITO_APP_CLIENT_ID")
COGNITO_REGION = os.environ.get("COGNITO_REGION", AWS_REGION)

# QuickSight Configuration
QUICKSIGHT_NAMESPACE = os.environ.get("QUICKSIGHT_NAMESPACE", "default")
QUICKSIGHT_TOPIC_ID = os.environ.get("QUICKSIGHT_TOPIC_ID")  # For curated Q&A
QUICKSIGHT_DASHBOARD_ID = os.environ.get("QUICKSIGHT_DASHBOARD_ID")  # Optional

# Allowed domains for embedding (must match QuickSight console settings)
ALLOWED_DOMAINS = [
    os.environ.get("HOSTED_APP_DOMAIN", "https://quicksuite.yourcompany.com"),
]

# AWS Clients
quicksight_client = boto3.client("quicksight", region_name=AWS_REGION)

# Cognito JWT verification
COGNITO_ISSUER = f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}"
jwks_client = PyJWKClient(f"{COGNITO_ISSUER}/.well-known/jwks.json")


# ============================================================
# AUTHENTICATION
# ============================================================


def get_cognito_public_key(token: str):
    """Get the public key for verifying Cognito JWT"""
    signing_key = jwks_client.get_signing_key_from_jwt(token)
    return signing_key.key


def verify_cognito_token(token: str) -> dict:
    """
    Verify Cognito JWT token and return claims.

    The token contains:
    - sub: Cognito user UUID
    - email: User's email
    - cognito:username: Username
    - cognito:groups: User groups (optional)
    """
    try:
        public_key = get_cognito_public_key(token)

        claims = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience=COGNITO_APP_CLIENT_ID,
            issuer=COGNITO_ISSUER,
        )

        return claims

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


async def get_current_user(authorization: str = Header(...)) -> dict:
    """
    Dependency to extract and verify user from Authorization header.
    Returns Cognito claims.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization[7:]  # Remove "Bearer " prefix
    claims = verify_cognito_token(token)

    return claims


# ============================================================
# QUICKSIGHT USER MANAGEMENT
# ============================================================


def get_quicksight_user_arn(email: str) -> str:
    """
    Get or create QuickSight user ARN for the given email.

    QuickSight users can be:
    1. Pre-provisioned in QuickSight console
    2. Auto-provisioned via RegisterUser API
    3. Federated via IAM Identity Center
    """
    return f"arn:aws:quicksight:{AWS_REGION}:{AWS_ACCOUNT_ID}:user/{QUICKSIGHT_NAMESPACE}/{email}"


def ensure_quicksight_user(email: str, identity_type: str = "QUICKSIGHT") -> str:
    """
    Ensure user exists in QuickSight, creating if necessary.

    Identity types:
    - QUICKSIGHT: Native QuickSight user
    - IAM: IAM user/role
    - FEDERATED: Federated via SAML/Identity Center

    Returns the user ARN.
    """
    user_arn = get_quicksight_user_arn(email)

    try:
        # Check if user exists
        quicksight_client.describe_user(
            AwsAccountId=AWS_ACCOUNT_ID,
            Namespace=QUICKSIGHT_NAMESPACE,
            UserName=email
        )
        return user_arn

    except quicksight_client.exceptions.ResourceNotFoundException:
        # User doesn't exist, create them
        try:
            quicksight_client.register_user(
                AwsAccountId=AWS_ACCOUNT_ID,
                Namespace=QUICKSIGHT_NAMESPACE,
                IdentityType=identity_type,
                Email=email,
                UserName=email,
                UserRole="READER",  # Or AUTHOR for more permissions
                SessionName=email
            )
            return user_arn

        except quicksight_client.exceptions.ResourceExistsException:
            # Race condition - user was created between check and create
            return user_arn
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to provision QuickSight user: {str(e)}"
            )


# ============================================================
# API ENDPOINTS
# ============================================================


class EmbedUrlResponse(BaseModel):
    url: str
    expiresAt: str


@app.post("/api/quicksight/embed-url", response_model=EmbedUrlResponse)
async def get_embed_url(user: dict = Depends(get_current_user)):
    """
    Generate QuickSight embed URL for authenticated user.

    The experience type is configured server-side:
    - GenerativeQnA: For Q&A chat with curated topics
    - Dashboard: For dashboard viewing
    - Console: For full QuickSight console access
    """
    try:
        # Extract user email from Cognito claims
        email = user.get("email") or user.get("cognito:username")
        if not email:
            raise HTTPException(status_code=400, detail="Email not found in token")

        # Ensure user exists in QuickSight
        user_arn = ensure_quicksight_user(email)

        # Build experience configuration
        experience_config = {}

        if QUICKSIGHT_TOPIC_ID:
            # Generative Q&A experience with curated topic
            experience_config["GenerativeQnA"] = {
                "InitialTopicId": QUICKSIGHT_TOPIC_ID
            }
        elif QUICKSIGHT_DASHBOARD_ID:
            # Dashboard experience
            experience_config["Dashboard"] = {
                "InitialDashboardId": QUICKSIGHT_DASHBOARD_ID
            }
        else:
            # Default to Q search bar
            experience_config["QSearchBar"] = {
                "InitialTopicId": "default"
            }

        # Generate embed URL
        response = quicksight_client.generate_embed_url_for_registered_user(
            AwsAccountId=AWS_ACCOUNT_ID,
            UserArn=user_arn,
            SessionLifetimeInMinutes=60,
            AllowedDomains=ALLOWED_DOMAINS,
            ExperienceConfiguration=experience_config
        )

        embed_url = response["EmbedUrl"]
        expires_at = (datetime.utcnow() + timedelta(minutes=60)).isoformat()

        return EmbedUrlResponse(url=embed_url, expiresAt=expires_at)

    except quicksight_client.exceptions.AccessDeniedException as e:
        raise HTTPException(status_code=403, detail="QuickSight access denied")
    except quicksight_client.exceptions.ResourceNotFoundException as e:
        raise HTTPException(status_code=404, detail="QuickSight resource not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


# ============================================================
# AWS LAMBDA HANDLER
# ============================================================

def lambda_handler(event, context):
    """
    AWS Lambda handler for API Gateway.

    Use with API Gateway HTTP API (v2) or REST API (v1).
    Requires Mangum for ASGI compatibility.
    """
    from mangum import Mangum
    handler = Mangum(app)
    return handler(event, context)


# ============================================================
# LOCAL DEVELOPMENT
# ============================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


# ============================================================
# AWS CDK / SAM DEPLOYMENT TEMPLATE
# ============================================================

"""
# AWS SAM template.yaml

AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Parameters:
  CognitoUserPoolId:
    Type: String
  CognitoAppClientId:
    Type: String
  QuickSightTopicId:
    Type: String
  HostedAppDomain:
    Type: String
    Default: https://quicksuite.yourcompany.com

Globals:
  Function:
    Timeout: 30
    Runtime: python3.11
    Environment:
      Variables:
        AWS_ACCOUNT_ID: !Ref AWS::AccountId
        COGNITO_USER_POOL_ID: !Ref CognitoUserPoolId
        COGNITO_APP_CLIENT_ID: !Ref CognitoAppClientId
        QUICKSIGHT_TOPIC_ID: !Ref QuickSightTopicId
        HOSTED_APP_DOMAIN: !Ref HostedAppDomain

Resources:
  QuickSuiteApi:
    Type: AWS::Serverless::Function
    Properties:
      Handler: backend-api-example.lambda_handler
      CodeUri: .
      MemorySize: 256
      Policies:
        - Version: '2012-10-17'
          Statement:
            - Effect: Allow
              Action:
                - quicksight:GenerateEmbedUrlForRegisteredUser
                - quicksight:RegisterUser
                - quicksight:DescribeUser
              Resource: '*'
      Events:
        EmbedUrl:
          Type: HttpApi
          Properties:
            Path: /api/quicksight/embed-url
            Method: POST
        Health:
          Type: HttpApi
          Properties:
            Path: /api/health
            Method: GET

Outputs:
  ApiUrl:
    Description: API Gateway endpoint URL
    Value: !Sub "https://${ServerlessHttpApi}.execute-api.${AWS::Region}.amazonaws.com"
"""


# ============================================================
# COGNITO USER POOL SETUP (reference)
# ============================================================

"""
To set up Cognito for Quick Suite:

1. Create User Pool:
   - Enable email as username
   - Configure password policy
   - Add required attributes: email

2. Create App Client:
   - Enable Cognito User Pool as identity provider
   - Set callback URLs to your hosted app
   - Enable authorization code grant
   - Enable openid, email, profile scopes

3. (Optional) Configure Identity Provider:
   - Add SAML or OIDC provider for SSO
   - Map attributes from IdP to Cognito

4. Domain Setup:
   - Configure Cognito hosted UI domain
   - Or use custom domain

5. QuickSight Integration:
   - Users authenticated via Cognito are mapped to QuickSight users
   - Use RegisterUser API for auto-provisioning
   - Or pre-provision users in QuickSight console
"""

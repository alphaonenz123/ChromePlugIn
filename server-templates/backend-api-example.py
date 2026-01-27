"""
QuickSight Embed URL API - Backend Example

This is an example backend implementation (AWS Lambda / Flask / FastAPI)
that generates embed URLs for the Ask Pinnacle Chrome extension.

SECURITY REQUIREMENTS:
1. This backend MUST be hosted on HTTPS
2. Implement proper authentication (JWT/OAuth)
3. Never expose AWS credentials to the client
4. Validate all inputs
5. Rate limit API requests

DEPLOYMENT OPTIONS:
- AWS Lambda + API Gateway (recommended)
- EC2 / ECS with Flask/FastAPI
- Any HTTPS-capable hosting
"""

import boto3
import json
import os
from datetime import datetime, timedelta
from functools import wraps

# Flask example (can be adapted for Lambda, FastAPI, etc.)
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins=['chrome-extension://*', 'https://your-wrapper-domain.com'])

# QuickSight client
quicksight_client = boto3.client('quicksight', region_name=os.environ.get('AWS_REGION', 'us-east-1'))

# Configuration
AWS_ACCOUNT_ID = os.environ.get('AWS_ACCOUNT_ID')
QUICKSIGHT_NAMESPACE = os.environ.get('QUICKSIGHT_NAMESPACE', 'default')

# Allowed domains for embedding (must match QuickSight console settings)
ALLOWED_DOMAINS = [
    'https://your-wrapper-domain.com',
    # Add additional allowed domains here
]


def validate_auth_token(f):
    """
    Decorator to validate JWT/Bearer token
    Replace with your authentication logic
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid authorization header'}), 401

        token = auth_header.split(' ')[1]

        # TODO: Implement your token validation logic
        # Example: Verify JWT signature, check expiration, etc.
        # user_info = verify_jwt_token(token)

        # For demo purposes, we'll use a simple check
        if not token or len(token) < 10:
            return jsonify({'error': 'Invalid token'}), 401

        return f(*args, **kwargs)
    return decorated_function


def get_quicksight_user_arn(username: str) -> str:
    """
    Construct the QuickSight user ARN.
    In production, map authenticated user to QuickSight user.
    """
    return f'arn:aws:quicksight:{os.environ.get("AWS_REGION", "us-east-1")}:{AWS_ACCOUNT_ID}:user/{QUICKSIGHT_NAMESPACE}/{username}'


@app.route('/auth/login', methods=['POST'])
def login():
    """
    Authentication endpoint.
    Replace with your actual authentication logic.
    """
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    # TODO: Implement actual authentication
    # Example: Validate against your user database, LDAP, etc.

    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400

    # Generate JWT token (example - use proper JWT library in production)
    # token = generate_jwt_token(username)

    # For demo purposes
    token = f'demo_token_{username}_{datetime.utcnow().timestamp()}'

    return jsonify({
        'token': token,
        'expiresIn': 86400,  # 24 hours in seconds
        'username': username
    })


@app.route('/auth/check', methods=['GET'])
@validate_auth_token
def check_auth():
    """
    Validate authentication token.
    """
    return jsonify({'valid': True, 'message': 'Token is valid'})


@app.route('/quicksuite/embed-url', methods=['POST'])
@validate_auth_token
def get_embed_url():
    """
    Generate QuickSight embed URL for Generative Q&A experience.

    Request body:
    {
        "agentArn": "optional - specific agent ARN",
        "initialQuery": "optional - initial question to ask",
        "topicId": "optional - curated topic ID for Q&A"
    }

    Response:
    {
        "url": "https://us-east-1.quicksight.aws.amazon.com/embed/..."
    }
    """
    try:
        data = request.get_json() or {}

        # Extract parameters
        agent_arn = data.get('agentArn')
        initial_query = data.get('initialQuery')
        topic_id = data.get('topicId')

        # Get authenticated user (from your auth system)
        # For demo, we'll use a default user
        username = 'demo-user'  # TODO: Get from authenticated session

        # Build the experience configuration for Generative Q&A
        experience_config = {}

        if topic_id:
            # Use GenerativeQnA with curated topic
            experience_config['GenerativeQnA'] = {
                'InitialTopicId': topic_id
            }
        elif agent_arn:
            # Use specific agent
            experience_config['QSearchBar'] = {
                'InitialTopicId': topic_id if topic_id else None
            }
        else:
            # Default Q experience
            experience_config['GenerativeQnA'] = {}

        # Add initial query if provided
        # Note: InitialQuery support depends on QuickSight version
        # Check AWS documentation for your region

        # Generate the embed URL
        response = quicksight_client.generate_embed_url_for_registered_user(
            AwsAccountId=AWS_ACCOUNT_ID,
            UserArn=get_quicksight_user_arn(username),
            SessionLifetimeInMinutes=60,  # URL valid for 60 minutes
            AllowedDomains=ALLOWED_DOMAINS,
            ExperienceConfiguration=experience_config
        )

        embed_url = response.get('EmbedUrl')

        if not embed_url:
            return jsonify({'error': 'Failed to generate embed URL'}), 500

        return jsonify({
            'url': embed_url,
            'expiresAt': (datetime.utcnow() + timedelta(minutes=60)).isoformat()
        })

    except quicksight_client.exceptions.AccessDeniedException as e:
        app.logger.error(f'QuickSight access denied: {e}')
        return jsonify({'error': 'Access denied to QuickSight'}), 403

    except quicksight_client.exceptions.ResourceNotFoundException as e:
        app.logger.error(f'QuickSight resource not found: {e}')
        return jsonify({'error': 'QuickSight resource not found'}), 404

    except Exception as e:
        app.logger.error(f'Error generating embed URL: {e}')
        return jsonify({'error': 'Internal server error'}), 500


@app.route('/quicksuite/topics', methods=['GET'])
@validate_auth_token
def list_topics():
    """
    List available Q Topics for the dropdown in extension settings.

    Response:
    {
        "topics": [
            {"id": "topic-id-1", "name": "Patient Data Analysis"},
            {"id": "topic-id-2", "name": "Financial Reports"}
        ]
    }
    """
    try:
        response = quicksight_client.list_topics(
            AwsAccountId=AWS_ACCOUNT_ID
        )

        topics = [
            {
                'id': topic['TopicId'],
                'name': topic['Name'],
                'description': topic.get('Description', '')
            }
            for topic in response.get('TopicsSummaries', [])
        ]

        return jsonify({'topics': topics})

    except Exception as e:
        app.logger.error(f'Error listing topics: {e}')
        return jsonify({'error': 'Failed to list topics'}), 500


# Lambda handler (if deploying as AWS Lambda)
def lambda_handler(event, context):
    """
    AWS Lambda handler for API Gateway integration.
    """
    from awsgi import response
    return response(app, event, context)


if __name__ == '__main__':
    # Development server
    app.run(host='0.0.0.0', port=5000, debug=True)


# =============================================================================
# AWS CDK / SAM Template Example
# =============================================================================
"""
# AWS SAM template.yaml example:

AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Resources:
  QuickSuiteApi:
    Type: AWS::Serverless::Function
    Properties:
      Handler: backend-api-example.lambda_handler
      Runtime: python3.11
      Timeout: 30
      MemorySize: 256
      Environment:
        Variables:
          AWS_ACCOUNT_ID: !Ref AWS::AccountId
          QUICKSIGHT_NAMESPACE: default
      Policies:
        - Version: '2012-10-17'
          Statement:
            - Effect: Allow
              Action:
                - quicksight:GenerateEmbedUrlForRegisteredUser
                - quicksight:ListTopics
              Resource: '*'
      Events:
        EmbedUrl:
          Type: Api
          Properties:
            Path: /quicksuite/embed-url
            Method: POST
        Topics:
          Type: Api
          Properties:
            Path: /quicksuite/topics
            Method: GET
        Login:
          Type: Api
          Properties:
            Path: /auth/login
            Method: POST
        AuthCheck:
          Type: Api
          Properties:
            Path: /auth/check
            Method: GET
"""

import boto3
from config import config

# DynamoDBクライアント
dynamodb = boto3.resource('dynamodb', region_name=config.AWS_REGION)

def get_table(table_name: str):
    """DynamoDBテーブルを取得"""
    return dynamodb.Table(table_name)

import os

class Config:
    # DynamoDB
    DYNAMODB_TABLE_PREFIX = os.getenv('DYNAMODB_TABLE_PREFIX', 'hasu-fantasy-')
    AWS_REGION = os.getenv('APP_REGION', 'ap-northeast-1')
    
    # S3
    S3_BUCKET_NAME = os.getenv('S3_BUCKET_NAME', 'hasu-fantasy-images')
    S3_REGION = os.getenv('S3_REGION', 'ap-northeast-1')
    
    # Quiz
    QUIZ_COOLDOWN_MINUTES = int(os.getenv('QUIZ_COOLDOWN_MINUTES', '30'))
    
    # Admin
    ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', 'change_me_in_production')
    
    # Tables
    @property
    def USERS_TABLE(self):
        return f"{self.DYNAMODB_TABLE_PREFIX}users"
    
    @property
    def SPOTS_TABLE(self):
        return f"{self.DYNAMODB_TABLE_PREFIX}spots"
    
    @property
    def CHECKINS_TABLE(self):
        return f"{self.DYNAMODB_TABLE_PREFIX}checkins"
    
    @property
    def COOLDOWNS_TABLE(self):
        return f"{self.DYNAMODB_TABLE_PREFIX}cooldowns"
    
    @property
    def MASTER_VERSION_TABLE(self):
        return f"{self.DYNAMODB_TABLE_PREFIX}master_version"
    
    @property
    def AREAS_TABLE(self):
        return f"{self.DYNAMODB_TABLE_PREFIX}areas"

config = Config()

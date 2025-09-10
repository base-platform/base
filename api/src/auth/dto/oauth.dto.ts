import { IsString, IsEmail, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OAuthCallbackDto {
  @ApiProperty({
    description: 'OAuth authorization code',
    example: 'abc123code',
  })
  @IsString()
  code: string;

  @ApiPropertyOptional({
    description: 'OAuth state parameter for security',
    example: 'random-state-string',
  })
  @IsString()
  @IsOptional()
  state?: string;
}

export class OAuthInitiateDto {
  @ApiProperty({
    description: 'OAuth provider',
    example: 'google',
    enum: ['google', 'github'],
  })
  @IsString()
  provider: 'google' | 'github';

  @ApiPropertyOptional({
    description: 'Redirect URL after authentication',
    example: 'http://localhost:3000/auth/callback',
  })
  @IsUrl()
  @IsOptional()
  redirectUrl?: string;
}

export class LinkOAuthAccountDto {
  @ApiProperty({
    description: 'OAuth provider',
    example: 'google',
    enum: ['google', 'github'],
  })
  @IsString()
  provider: 'google' | 'github';

  @ApiProperty({
    description: 'OAuth authorization code',
    example: 'abc123code',
  })
  @IsString()
  code: string;
}
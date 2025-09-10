import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lastName?: string;
}

export class LoginDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class CreateApiKeyDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  permissions?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  expiresAt?: Date;
}

export class RotateApiKeyDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  newName?: string;
}

export class BulkRotateKeysDto {
  @ApiProperty({ type: [String] })
  @IsString({ each: true })
  keyIds: string[];
}

export class ExpireApiKeyDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}
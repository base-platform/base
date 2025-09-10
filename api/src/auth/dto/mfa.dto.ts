import { IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EnableMfaDto {
  @ApiProperty({
    description: 'MFA token from authenticator app',
    example: '123456',
  })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'Token must be 6 digits' })
  token: string;
}

export class VerifyMfaDto {
  @ApiProperty({
    description: 'MFA token from authenticator app or backup code',
    example: '123456',
  })
  @IsString()
  @Matches(/^\d{6,8}$/, { message: 'Token must be 6-8 digits' })
  token: string;
}

export class DisableMfaDto {
  @ApiProperty({
    description: 'MFA token to confirm disabling',
    example: '123456',
  })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'Token must be 6 digits' })
  token: string;
}

export class GenerateBackupCodesDto {
  @ApiProperty({
    description: 'MFA token to confirm generating new backup codes',
    example: '123456',
  })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'Token must be 6 digits' })
  token: string;
}

export class LoginWithMfaDto {
  @ApiProperty({
    description: 'Temporary token from initial login',
    example: 'eyJhbGciOiJIUzI1NiIs...',
  })
  @IsString()
  tempToken: string;

  @ApiProperty({
    description: 'MFA token from authenticator app or backup code',
    example: '123456',
  })
  @IsString()
  @Matches(/^\d{6,8}$/, { message: 'MFA token must be 6-8 digits' })
  mfaToken: string;
}
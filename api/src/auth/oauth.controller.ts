import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  UseGuards,
  Request,
  Param,
  Redirect,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { OAuthService } from '../core/security/oauth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  OAuthCallbackDto,
  OAuthInitiateDto,
  LinkOAuthAccountDto,
} from './dto/oauth.dto';

@ApiTags('OAuth')
@Controller('auth/oauth')
export class OAuthController {
  constructor(private readonly oauthService: OAuthService) {}

  @Get('authorize/:provider')
  @ApiOperation({ summary: 'Initiate OAuth authorization' })
  @ApiResponse({
    status: 302,
    description: 'Redirect to OAuth provider',
  })
  @ApiQuery({ name: 'redirectUrl', required: false })
  @Redirect()
  async authorize(
    @Param('provider') provider: string,
    @Query('redirectUrl') redirectUrl?: string,
  ) {
    const authUrl = this.oauthService.generateAuthUrl(provider, redirectUrl);
    return { url: authUrl };
  }

  @Get('callback')
  @ApiOperation({ summary: 'Handle OAuth callback' })
  @ApiResponse({
    status: 200,
    description: 'OAuth login successful',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string' },
          },
        },
      },
    },
  })
  async callback(@Query() query: OAuthCallbackDto & { provider: string }) {
    const userInfo = await this.oauthService.handleCallback(
      query.provider,
      query.code,
      query.state,
    );
    
    return this.oauthService.loginWithOAuth(userInfo);
  }

  @Post('link')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Link OAuth account to current user' })
  @ApiResponse({
    status: 200,
    description: 'OAuth account linked successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  async linkAccount(
    @Request() req: any,
    @Body() dto: LinkOAuthAccountDto,
  ) {
    const userInfo = await this.oauthService.handleCallback(
      dto.provider,
      dto.code,
    );
    
    return this.oauthService.linkAccount(req.user.userId, userInfo);
  }

  @Delete(':provider/unlink')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unlink OAuth account' })
  @ApiResponse({
    status: 200,
    description: 'OAuth account unlinked successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  async unlinkAccount(
    @Request() req: any,
    @Param('provider') provider: string,
  ) {
    return this.oauthService.unlinkAccount(req.user.userId, provider);
  }

  @Get('accounts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get linked OAuth accounts' })
  @ApiResponse({
    status: 200,
    description: 'List of linked OAuth accounts',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          provider: { type: 'string' },
          provider_email: { type: 'string' },
          provider_name: { type: 'string' },
          provider_avatar: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  async getLinkedAccounts(@Request() req: any) {
    return this.oauthService.getLinkedAccounts(req.user.userId);
  }
}
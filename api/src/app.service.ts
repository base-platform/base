import { Injectable } from '@nestjs/common';
import { PrismaService } from './core/database/prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) {}

  getHello(): string {
    return 'Runtime API Platform - Backend Running';
  }

  async getDashboardStats() {
    try {
      const [
        totalEntities,
        totalActiveApiKeys,
        totalFunctions,
        totalUsers,
        recentActivity,
        apiUsageStats
      ] = await Promise.all([
        // Total entities count
        this.prisma.entity.count({
          where: { is_active: true }
        }),

        // Active API keys count
        this.prisma.apiKey.count({
          where: { status: 'active' }
        }),

        // Functions count (when available)
        this.prisma.function.count({
          where: { is_active: true }
        }).catch(() => 0), // Fallback to 0 if functions table doesn't exist yet

        // Total users count
        this.prisma.user.count({
          where: { is_active: true }
        }),

        // Recent activity from audit logs
        this.prisma.auditLog.findMany({
          take: 10,
          orderBy: { created_at: 'desc' },
          include: {
            user: {
              select: {
                first_name: true,
                last_name: true,
                email: true
              }
            }
          }
        }),

        // API usage stats for the last 7 days
        this.prisma.apiUsage.groupBy({
          by: ['created_at'],
          where: {
            created_at: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          },
          _count: {
            id: true
          },
          orderBy: {
            created_at: 'desc'
          }
        }).catch(() => []) // Fallback to empty array if api_usage table doesn't exist yet
      ]);

      // Calculate growth metrics (mock data for now, can be enhanced with historical data)
      const stats = {
        totalEntities: {
          value: totalEntities,
          change: '+2 from last month',
          percentage: totalEntities > 0 ? 12 : 0
        },
        totalApiKeys: {
          value: totalActiveApiKeys,
          change: `+12% from last month`,
          percentage: 12
        },
        totalFunctions: {
          value: totalFunctions,
          change: '+5 new this week',
          percentage: totalFunctions > 0 ? 25 : 0
        },
        totalUsers: {
          value: totalUsers,
          change: '+18% from last month',
          percentage: 18
        }
      };

      // Format recent activity
      const formattedActivity = recentActivity.map(activity => ({
        action: this.formatAction(activity.action),
        entity: activity.entity_type || 'Unknown',
        time: this.formatTimeAgo(activity.created_at),
        user: activity.user ? 
          `${activity.user.first_name || ''} ${activity.user.last_name || ''}`.trim() || activity.user.email :
          'System'
      }));

      return {
        stats,
        recentActivity: formattedActivity,
        apiUsage: apiUsageStats.map(usage => ({
          date: usage.created_at,
          requests: usage._count.id
        }))
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Return fallback data if database is not available
      return {
        stats: {
          totalEntities: { value: 0, change: 'Database unavailable', percentage: 0 },
          totalApiKeys: { value: 0, change: 'Database unavailable', percentage: 0 },
          totalFunctions: { value: 0, change: 'Database unavailable', percentage: 0 },
          totalUsers: { value: 0, change: 'Database unavailable', percentage: 0 }
        },
        recentActivity: [
          { action: 'System status', entity: 'API Platform', time: 'Now', user: 'System' }
        ],
        apiUsage: []
      };
    }
  }

  private formatAction(action: string): string {
    const actionMap: Record<string, string> = {
      'create_entity': 'Entity created',
      'create_api_key': 'API key generated',
      'create_function': 'Function deployed',
      'update_rate_limit': 'Rate limit updated',
      'login': 'User login',
      'register': 'User registered'
    };
    return actionMap[action] || action;
  }

  private formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    }
  }
}
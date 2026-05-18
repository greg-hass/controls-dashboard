import { useCallback, useEffect, useState } from 'react';
import { useAppStore } from '@/store/appStore';
import {
  UtensilsCrossed,
  BookOpen,
  Moon,
  Smartphone,
  Users,
  Clock,
  Play,
  CheckCircle2,
  AlertCircle,
  Timer,
  X,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { QuickAction } from '@/types/controld';
import { getCurrentTimeMs } from '@/services/deviceStatus';

const iconMap: Record<string, React.ReactNode> = {
  UtensilsCrossed: <UtensilsCrossed className="w-6 h-6" />,
  BookOpen: <BookOpen className="w-6 h-6" />,
  Moon: <Moon className="w-6 h-6" />,
  Smartphone: <Smartphone className="w-6 h-6" />,
  Users: <Users className="w-6 h-6" />,
};

const colorMap: Record<string, string> = {
  dinner_mode: 'from-orange-500 to-red-500',
  homework_mode: 'from-blue-500 to-indigo-500',
  bedtime: 'from-indigo-500 to-purple-500',
  social_freeze: 'from-rose-500 to-pink-500',
  guest_unlock: 'from-emerald-500 to-teal-500',
};

const bgColorMap: Record<string, string> = {
  dinner_mode: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  homework_mode: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  bedtime: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  social_freeze: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  guest_unlock: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
};

interface ActiveAction {
  action: QuickAction;
  startTime: number;
  endTime: number;
  remainingMinutes: number;
  previousStatuses: Record<string, number>;
}

export function QuickActions() {
  const quickActions = useAppStore((state) => state.quickActions);
  const services = useAppStore((state) => state.services);
  const profileServices = useAppStore((state) => state.profileServices);
  const updateProfileServices = useAppStore((state) => state.updateProfileServices);
  const [activeActions, setActiveActions] = useState<ActiveAction[]>([]);
  const [completedAction, setCompletedAction] = useState<string | null>(null);

  const statusKey = (profileId: string, serviceId: string) => `${profileId}:${serviceId}`;

  const getCurrentServiceStatus = useCallback(
    (profileId: string, serviceId: string) =>
      (profileServices[profileId] ?? services).find((service) => service.PK === serviceId)?.status ?? 1,
    [profileServices, services]
  );

  const restoreServices = useCallback((previousStatuses: Record<string, number>) => {
    void Promise.all(
      Object.entries(previousStatuses).map(([key, status]) => {
        const [profileId, serviceId] = key.split(':');
        if (!profileId || !serviceId) return Promise.resolve();
        return updateProfileServices(profileId, serviceId, status);
      })
    );
  }, [updateProfileServices]);

  // Timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveActions((prev) => {
        const now = getCurrentTimeMs();
        const updated = prev.map((a) => ({
          ...a,
          remainingMinutes: Math.max(0, Math.ceil((a.endTime - now) / 60000)),
        }));
        const completed = updated.filter((a) => a.remainingMinutes === 0);
        if (completed.length > 0) {
          completed.forEach((c) => {
            setCompletedAction(c.action.name);
            setTimeout(() => setCompletedAction(null), 3000);
            restoreServices(c.previousStatuses);
          });
        }
        return updated.filter((a) => a.remainingMinutes > 0);
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [restoreServices]);

  const activateAction = async (action: QuickAction) => {
    const now = getCurrentTimeMs();
    const durationMs = (action.duration_minutes || 60) * 60 * 1000;
    const previousStatuses: Record<string, number> = {};
    const mutations: Promise<void>[] = [];

    action.services_to_block?.forEach((serviceId) => {
      action.profile_ids?.forEach((profileId) => {
        previousStatuses[statusKey(profileId, serviceId)] = getCurrentServiceStatus(profileId, serviceId);
        mutations.push(updateProfileServices(profileId, serviceId, 0));
      });
    });

    action.services_to_allow?.forEach((serviceId) => {
      action.profile_ids?.forEach((profileId) => {
        previousStatuses[statusKey(profileId, serviceId)] = getCurrentServiceStatus(profileId, serviceId);
        mutations.push(updateProfileServices(profileId, serviceId, 1));
      });
    });

    await Promise.all(mutations);

    setActiveActions((prev) => [
      ...prev.filter((a) => a.action.id !== action.id),
      {
        action,
        startTime: now,
        endTime: now + durationMs,
        remainingMinutes: action.duration_minutes || 60,
        previousStatuses,
      },
    ]);
  };

  const cancelAction = (actionToCancel: QuickAction) => {
    const activeAction = activeActions.find((action) => action.action.id === actionToCancel.id);
    setActiveActions((prev) => prev.filter((a) => a.action.id !== actionToCancel.id));
    if (activeAction) {
      restoreServices(activeAction.previousStatuses);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Quick Actions</h2>
        <p className="text-muted-foreground mt-1">
          One-tap focus modes for your family
        </p>
      </div>

      {/* Active Actions */}
      {activeActions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Timer className="w-4 h-4" />
            Active ({activeActions.length})
          </h3>
          {activeActions.map((active) => {
            const progress = ((active.action.duration_minutes || 60) - active.remainingMinutes) / (active.action.duration_minutes || 60) * 100;
            return (
              <Card key={active.action.id} className={cn('border', bgColorMap[active.action.id])}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {iconMap[active.action.icon]}
                      <div>
                        <p className="font-medium">{active.action.name}</p>
                        <p className="text-xs opacity-70">
                          {active.remainingMinutes} minutes remaining
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => cancelAction(active.action)}
                      className="opacity-70 hover:opacity-100"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                  <Progress value={progress} className="mt-3 h-1.5" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Completion toast */}
      {completedAction && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-sm">{completedAction} has ended. Services restored.</span>
        </div>
      )}

      {/* Action Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickActions.map((action) => {
          const isActive = activeActions.some((a) => a.action.id === action.id);
          return (
            <Card
              key={action.id}
              className={cn(
                'glass-card transition-all duration-300',
                isActive ? 'opacity-50 pointer-events-none' : 'hover:shadow-lg cursor-pointer'
              )}
              onClick={() => !isActive && activateAction(action)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center',
                    'bg-gradient-to-br',
                    colorMap[action.id] || 'from-gray-500 to-gray-600'
                  )}>
                    <div className="text-white">
                      {iconMap[action.icon]}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    {action.duration_minutes}m
                  </Badge>
                </div>

                <h3 className="font-semibold text-base mb-1">{action.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {action.description}
                </p>

                <div className="space-y-2">
                  {action.services_to_block && action.services_to_block.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Blocks:</p>
                      <div className="flex flex-wrap gap-1">
                        {action.services_to_block.slice(0, 4).map((serviceId) => {
                          const service = services.find((s) => s.PK === serviceId);
                          return (
                            <Badge key={serviceId} variant="secondary" className="text-xs">
                              {service?.name || serviceId}
                            </Badge>
                          );
                        })}
                        {action.services_to_block.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{action.services_to_block.length - 4} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {action.services_to_allow && action.services_to_allow.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Allows:</p>
                      <div className="flex flex-wrap gap-1">
                        {action.services_to_allow.map((serviceId) => {
                          const service = services.find((s) => s.PK === serviceId);
                          return (
                            <Badge key={serviceId} variant="default" className="text-xs">
                              {service?.name || serviceId}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  className={cn(
                    'w-full mt-4 bg-gradient-to-r',
                    colorMap[action.id] || 'from-gray-500 to-gray-600'
                  )}
                  disabled={isActive}
                >
                  <Play className="w-4 h-4 mr-1.5" />
                  {isActive ? 'Running...' : 'Activate'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info */}
      <Card className="glass-card bg-secondary/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">How Quick Actions work</p>
              <p className="text-sm text-muted-foreground mt-1">
                When you activate a Quick Action, it temporarily changes service blocking settings
                on the selected profiles. After the timer expires, all services are automatically
                restored to their previous state. You can cancel an active action at any time.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

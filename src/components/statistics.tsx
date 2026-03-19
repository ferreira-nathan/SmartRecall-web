'use client';

import { motion } from 'framer-motion';
import { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  Target, 
  Flame, 
  Clock, 
  CheckCircle,
  Calendar
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis } from 'recharts';
import { getReviewStats, getSubjects, getCourses, getPacks, getExercises } from '@/lib/db';
import type { ReviewStat, Exercise } from '@/lib/db';

interface HeatmapDay {
  date: string;
  count: number;
  level: number;
  dayOfWeek: number; // 0 = Monday, 6 = Sunday
  weekIndex: number;
}

export function Statistics() {
  const [reviewStats, setReviewStats] = useState<ReviewStat[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<HeatmapDay | null>(null);

  useEffect(() => {
    async function loadData() {
      const stats = await getReviewStats();
      setReviewStats(stats);

      // Get all exercises from all packs
      const exercises: Exercise[] = [];
      const subjects = await getSubjects();
      
      for (const subject of subjects) {
        const courses = await getCourses(subject.id!);
        for (const course of courses) {
          const packs = await getPacks(course.id!);
          for (const pack of packs) {
            const packExercises = await getExercises(pack.id!);
            exercises.push(...packExercises);
          }
        }
      }
      
      setAllExercises(exercises);
      setIsLoading(false);
    }
    loadData();
  }, []);

  // Calculate stats
  const stats = useMemo(() => {
    const totalReviews = allExercises.reduce((acc, ex) => acc + ex.totalReviews, 0);
    const correctReviews = allExercises.reduce((acc, ex) => acc + ex.correctReviews, 0);
    const successRate = totalReviews > 0 ? (correctReviews / totalReviews) * 100 : 0;
    const totalDuration = reviewStats.reduce((acc, stat) => acc + stat.duration, 0);
    const currentStreak = calculateStreak(reviewStats);
    const masteredCards = allExercises.filter(ex => ex.interval >= 21 && ex.stability >= 0.8).length;

    return {
      totalReviews,
      correctReviews,
      successRate,
      totalDuration,
      currentStreak,
      masteredCards,
      totalCards: allExercises.length,
    };
  }, [allExercises, reviewStats]);

  // Generate heatmap data (GitHub-style grid: 7 rows × ~52 columns)
  const heatmapData = useMemo(() => {
    const statsMap = new Map<string, number>();
    reviewStats.forEach(stat => {
      const dateStr = new Date(stat.date).toISOString().split('T')[0];
      const existing = statsMap.get(dateStr) || 0;
      statsMap.set(dateStr, existing + stat.cardsReviewed);
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Go back ~52 weeks from today
    // Find the Monday of the week 52 weeks ago
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364);
    // Align to Monday
    const dayOfWeek = startDate.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startDate.setDate(startDate.getDate() + mondayOffset);

    const days: HeatmapDay[] = [];
    const current = new Date(startDate);
    let weekIndex = 0;
    let prevWeek = -1;

    while (current <= today) {
      const dateStr = current.toISOString().split('T')[0];
      const count = statsMap.get(dateStr) || 0;
      // Day: 0=Mon, 6=Sun
      const dow = current.getDay();
      const adjustedDow = dow === 0 ? 6 : dow - 1; // Convert from Sun=0 to Mon=0

      // Calculate week index
      const diffDays = Math.floor((current.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      weekIndex = Math.floor(diffDays / 7);

      let level = 0;
      if (count > 0) level = 1;
      if (count > 5) level = 2;
      if (count > 10) level = 3;
      if (count > 20) level = 4;

      days.push({
        date: dateStr,
        count,
        level,
        dayOfWeek: adjustedDow,
        weekIndex,
      });

      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [reviewStats]);

  // Get month labels for heatmap
  const monthLabels = useMemo(() => {
    const labels: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;

    for (const day of heatmapData) {
      const date = new Date(day.date);
      const month = date.getMonth();
      if (month !== lastMonth && day.dayOfWeek === 0) {
        labels.push({
          label: new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(date),
          weekIndex: day.weekIndex,
        });
        lastMonth = month;
      }
    }

    return labels;
  }, [heatmapData]);

  // Max weeks for grid width
  const maxWeeks = useMemo(() => {
    if (heatmapData.length === 0) return 0;
    return heatmapData[heatmapData.length - 1].weekIndex + 1;
  }, [heatmapData]);

  // Generate chart data for last 30 days
  const chartData = useMemo(() => {
    const data: { date: string; reviews: number; correct: number }[] = [];
    const today = new Date();
    const statsMap = new Map<string, { reviews: number; correct: number }>();

    reviewStats.forEach(stat => {
      const dateStr = new Date(stat.date).toISOString().split('T')[0];
      const existing = statsMap.get(dateStr);
      if (existing) {
        existing.reviews += stat.cardsReviewed;
        existing.correct += stat.correctCount;
      } else {
        statsMap.set(dateStr, { reviews: stat.cardsReviewed, correct: stat.correctCount });
      }
    });

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const stat = statsMap.get(dateStr) || { reviews: 0, correct: 0 };

      data.push({
        date: new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date),
        reviews: stat.reviews,
        correct: stat.correct,
      });
    }

    return data;
  }, [reviewStats]);

  // Pie chart data
  const pieData = [
    { name: 'Maîtrisées', value: stats.masteredCards, color: '#22c55e' },
    { name: 'En cours', value: stats.totalCards - stats.masteredCards, color: '#eab308' },
  ];

  const dayLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-zinc-100 mb-2">Statistiques</h2>
        <p className="text-zinc-400">Suivi de ta progression</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Target}
          label="Taux de réussite"
          value={`${stats.successRate.toFixed(1)}%`}
          color="text-green-400"
          bgColor="bg-green-500/20"
        />
        <StatCard
          icon={Flame}
          label="Série actuelle"
          value={`${stats.currentStreak} jour${stats.currentStreak > 1 ? 's' : ''}`}
          color="text-orange-400"
          bgColor="bg-orange-500/20"
        />
        <StatCard
          icon={CheckCircle}
          label="Cartes maîtrisées"
          value={`${stats.masteredCards}/${stats.totalCards}`}
          color="text-cyan-400"
          bgColor="bg-cyan-500/20"
        />
        <StatCard
          icon={Clock}
          label="Temps total"
          value={formatDuration(stats.totalDuration)}
          color="text-purple-400"
          bgColor="bg-purple-500/20"
        />
      </div>

      {/* GitHub-style Heatmap */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-zinc-200 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-zinc-400" />
            Activité de révision
          </h3>
          <div className="flex items-center gap-1 text-xs text-zinc-500">
            <span>Moins</span>
            {[0, 1, 2, 3, 4].map(level => (
              <div
                key={level}
                className={`w-3 h-3 rounded-sm ${getHeatmapColor(level)}`}
              />
            ))}
            <span>Plus</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-max">
            {/* Month labels */}
            <div className="flex ml-8 mb-1">
              {monthLabels.map((m, i) => (
                <div
                  key={`${m.label}-${i}`}
                  className="text-xs text-zinc-500"
                  style={{
                    position: 'relative',
                    left: `${m.weekIndex * 15}px`,
                    marginRight: i < monthLabels.length - 1
                      ? `${(monthLabels[i + 1]?.weekIndex - m.weekIndex) * 15 - 30}px`
                      : '0',
                  }}
                >
                  {m.label}
                </div>
              ))}
            </div>

            {/* Grid: day labels + cells */}
            <div className="flex gap-0">
              {/* Day of week labels */}
              <div className="flex flex-col gap-[3px] mr-2 shrink-0">
                {dayLabels.map((label, i) => (
                  <div key={i} className="w-5 h-[13px] flex items-center justify-end text-[10px] text-zinc-500">
                    {i % 2 === 0 ? label : ''}
                  </div>
                ))}
              </div>

              {/* Heatmap grid */}
              <div className="flex gap-[3px]">
                {Array.from({ length: maxWeeks }, (_, weekIdx) => (
                  <div key={weekIdx} className="flex flex-col gap-[3px]">
                    {Array.from({ length: 7 }, (_, dayIdx) => {
                      const day = heatmapData.find(
                        d => d.weekIndex === weekIdx && d.dayOfWeek === dayIdx
                      );

                      if (!day) {
                        return <div key={dayIdx} className="w-[13px] h-[13px]" />;
                      }

                      return (
                        <div
                          key={dayIdx}
                          className={`w-[13px] h-[13px] rounded-sm ${getHeatmapColor(day.level)} cursor-pointer hover:ring-1 hover:ring-cyan-400 transition-all relative`}
                          onMouseEnter={() => setHoveredDay(day)}
                          onMouseLeave={() => setHoveredDay(null)}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Tooltip */}
            {hoveredDay && (
              <div className="mt-2 text-xs text-zinc-400">
                <span className="text-zinc-300 font-medium">
                  {new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(hoveredDay.date))}
                </span>
                {' — '}
                {hoveredDay.count === 0
                  ? 'Aucune révision'
                  : `${hoveredDay.count} carte${hoveredDay.count > 1 ? 's' : ''} révisée${hoveredDay.count > 1 ? 's' : ''}`}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Area Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6"
        >
          <h3 className="text-lg font-medium text-zinc-200 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-zinc-400" />
            Révisions (30 derniers jours)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorReviews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                tick={{ fill: '#71717a', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fill: '#71717a', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#a1a1aa' }}
              />
              <Area
                type="monotone"
                dataKey="reviews"
                stroke="#06b6d4"
                fillOpacity={1}
                fill="url(#colorReviews)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Pie Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6"
        >
          <h3 className="text-lg font-medium text-zinc-200 mb-4">
            Progression globale
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 mt-4">
            {pieData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-zinc-400">{entry.name}: {entry.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// Helper Components
function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  color, 
  bgColor 
}: { 
  icon: typeof Target;
  label: string;
  value: string;
  color: string;
  bgColor: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        <span className="text-sm text-zinc-400">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </motion.div>
  );
}

// Helper Functions
function calculateStreak(stats: ReviewStat[]): number {
  if (stats.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let streak = 0;
  let currentDate = today;

  // Sort stats by date descending
  const sortedStats = [...stats].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Check if reviewed today
  const todayStat = sortedStats.find(s => {
    const statDate = new Date(s.date);
    statDate.setHours(0, 0, 0, 0);
    return statDate.getTime() === today.getTime();
  });

  if (!todayStat) return 0;

  for (const stat of sortedStats) {
    const statDate = new Date(stat.date);
    statDate.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((currentDate.getTime() - statDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0 || diffDays === 1) {
      streak++;
      currentDate = statDate;
    } else {
      break;
    }
  }

  return streak;
}

function getHeatmapColor(level: number): string {
  switch (level) {
    case 0: return 'bg-zinc-800';
    case 1: return 'bg-cyan-900';
    case 2: return 'bg-cyan-700';
    case 3: return 'bg-cyan-500';
    case 4: return 'bg-cyan-400';
    default: return 'bg-zinc-800';
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
}

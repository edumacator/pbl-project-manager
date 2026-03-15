import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api, API_BASE } from '../api/client';
import { 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Calendar as CalendarIcon,
  Info,
  AlertTriangle
} from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, subDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface CalendarEvent {
  id: string;
  sourceType: 'task' | 'checkpoint' | 'project';
  sourceId: number;
  title: string;
  description?: string;
  due_date: string;
  start_date?: string;
  allDay: boolean;
  status?: string;
  priority?: string;
  team_id?: number;
  team_name?: string;
  assignee_name?: string;
  class_name?: string;
  project_id: number;
  color: string;
  is_stuck?: boolean;
}

interface CalendarViewProps {
    projectId?: number;
    teamId?: number;
    initialScope?: 'my-tasks' | 'my-team' | 'all';
    showHeader?: boolean;
    showFilters?: boolean;
}

const CalendarView: React.FC<CalendarViewProps> = ({ 
    projectId, 
    teamId, 
    initialScope,
    showHeader = true,
    showFilters = true
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    scope: initialScope || (user?.role === 'teacher' ? 'all' : 'my-team'),
    include_tasks: true,
    include_milestones: true,
    include_projects: true,
    project_id: projectId || null as number | null
  });
  const [projects, setProjects] = useState<any[]>([]);
  const [hoveredEvent, setHoveredEvent] = useState<CalendarEvent | null>(null);
  const [popoverPos, setPopoverPos] = useState({ x: 0, y: 0 });
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const [expandedDay, setExpandedDay] = useState<Date | null>(null);

  useEffect(() => {
    if (!projectId && (user?.role === 'teacher' || user?.role === 'admin')) {
        fetchProjects();
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [currentDate, filters, projectId, teamId]);

  const fetchProjects = async () => {
    try {
      const data = await api.get<any[]>('/projects');
      setProjects(data);
    } catch (err) {
      console.error('Failed to fetch projects', err);
    }
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('scope', filters.scope);
      params.append('include_tasks', String(filters.include_tasks));
      params.append('include_milestones', String(filters.include_milestones));
      params.append('include_projects', String(filters.include_projects));
      
      const pId = projectId || filters.project_id;
      if (pId) params.append('project_id', String(pId));
      if (teamId) params.append('team_id', String(teamId));

      const data = await api.get<CalendarEvent[]>(`/calendar/events?${params.toString()}`);
      setEvents(data);
    } catch (err) {
      console.error('Failed to fetch calendar events', err);
    } finally {
      setLoading(false);
    }
  };

  const next = () => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addDays(currentDate, 7));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const prev = () => {
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(subDays(currentDate, 7));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const handleExportAll = () => {
    const params = new URLSearchParams();
    params.append('scope', filters.scope);
    params.append('include_tasks', String(filters.include_tasks));
    params.append('include_milestones', String(filters.include_milestones));
    params.append('include_projects', String(filters.include_projects));
    
    const pId = projectId || filters.project_id;
    if (pId) params.append('project_id', String(pId));
    if (teamId) params.append('team_id', String(teamId));
    const token = localStorage.getItem('auth_token');
    if (token) params.append('token', token);
    
    window.open(`${API_BASE}/calendar/export.ics?${params.toString()}`, '_blank');
  };

  const handleExportSingle = (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    const token = localStorage.getItem('auth_token');
    const url = `${API_BASE}/calendar/events/${eventId}/ics${token ? `?token=${token}` : ''}`;
    window.open(url, '_blank');
  };

  const handleEventClick = (event: CalendarEvent) => {
    const query = event.sourceType === 'task' ? `?task=${event.sourceId}` : '';
    const basePath = user?.role === 'teacher' || user?.role === 'admin' 
      ? `/projects/${event.project_id}` 
      : `/student/projects/${event.project_id}`;
    
    navigate(`${basePath}${query}`);
  };

  const handleMouseEnter = (e: React.MouseEvent, event: CalendarEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top;

    if (hoverTimeout) clearTimeout(hoverTimeout);
    
    const timeout = setTimeout(() => {
      setPopoverPos({ x, y });
      setHoveredEvent(event);
    }, 200);
    
    setHoverTimeout(timeout);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    setHoveredEvent(null);
  };

  const renderHeader = () => {
    let dateLabel = "";
    if (viewMode === 'month') {
      dateLabel = format(currentDate, 'MMMM yyyy');
    } else if (viewMode === 'week') {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);
      dateLabel = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
    } else {
      dateLabel = format(currentDate, 'EEEE, MMMM d, yyyy');
    }

    return (
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <h2 className="text-2xl font-bold text-slate-800 min-w-[200px]">
            {dateLabel}
          </h2>
          <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <button 
              onClick={prev}
              className="p-2 hover:bg-slate-50 text-slate-600 transition-colors border-r border-slate-200"
              title="Previous"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={() => setCurrentDate(new Date())}
              className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Today
            </button>
            <button 
              onClick={next}
              className="p-2 hover:bg-slate-50 text-slate-600 transition-colors border-l border-slate-200"
              title="Next"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            {(['month', 'week', 'day'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                  viewMode === mode 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {showFilters && (
              <div className="flex bg-white border border-slate-200 rounded-lg shadow-sm p-1">
              {user?.role === 'student' && !projectId && (
                  <>
                  <button
                      onClick={() => setFilters({ ...filters, scope: 'my-tasks' })}
                      className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
                      filters.scope === 'my-tasks' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                      My Tasks
                  </button>
                  <button
                      onClick={() => setFilters({ ...filters, scope: 'my-team' })}
                      className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
                      filters.scope === 'my-team' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                      My Team
                  </button>
                  </>
              )}
              {(user?.role === 'teacher' || user?.role === 'admin') && !projectId && (
                  <select
                  value={filters.project_id || ''}
                  onChange={(e) => setFilters({ ...filters, project_id: e.target.value ? Number(e.target.value) : null })}
                  className="bg-transparent text-sm font-medium text-slate-600 focus:outline-none px-2 py-1"
                  >
                  <option value="">All Projects</option>
                  {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                  </select>
              )}
              </div>
          )}

          <div className="relative group mr-2">
            <span className="text-xs font-semibold text-amber-600 cursor-help flex items-center gap-1 bg-amber-50 px-2 py-2 rounded-lg border border-amber-100 hover:bg-amber-100 transition-colors">
              <Info size={14} />
              Snapshot Warning
            </span>
            <div className="absolute bottom-full mb-2 right-0 w-64 p-3 bg-white border border-slate-200 shadow-xl rounded-lg text-xs text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[12000] ring-1 ring-slate-900/5">
              <p className="font-bold text-amber-900 mb-1 text-[11px] uppercase tracking-wider">ICS Snapshot Notice</p>
              <p className="leading-relaxed">
                ICS files are <strong>static snapshots</strong>. They will <strong>not update automatically</strong> in your external calendar if deadlines change in the app.
              </p>
              <div className="absolute -bottom-1 right-8 w-2 h-2 bg-white border-r border-b border-slate-200 rotate-45"></div>
            </div>
          </div>

          <button
            onClick={handleExportAll}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-medium shadow-sm active:scale-95"
          >
            <Download size={18} />
            Export ICS
          </button>
        </div>
      </div>
    );
  };

  const renderEvent = (event: CalendarEvent, isSmall = true) => (
    <div
      key={event.id}
      onMouseEnter={(e) => handleMouseEnter(e, event)}
      onMouseLeave={handleMouseLeave}
      onClick={() => handleEventClick(event)}
      title={event.title}
      style={{ borderLeftColor: event.color }}
      className={`group relative px-2 py-1 font-medium rounded ${event.is_stuck ? 'bg-amber-50 border-amber-400' : 'bg-white border-slate-100'} hover:bg-slate-50 border border-l-4 shadow-sm cursor-pointer transition-all ${
        isSmall ? 'text-[11px]' : 'text-sm py-2'
      }`}
    >
      <div className="flex flex-col gap-0.5 max-w-full">
        <span className={`${event.is_stuck ? 'text-amber-900' : 'text-slate-800'} truncate font-bold`}>
          {event.is_stuck && "⚠️ "}{event.title}
        </span>
        {event.team_name && (
          <span className={`${isSmall ? 'text-[9px]' : 'text-[11px]'} text-slate-500 font-normal`}>
            Team: {event.team_name}
          </span>
        )}
      </div>
      <button
        onClick={(e) => handleExportSingle(e, event.id)}
        className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Download size={isSmall ? 10 : 14} />
      </button>
    </div>
  );

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    const weekdayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const currentDayStr = format(day, 'yyyy-MM-dd');
        const currentDayCopy = new Date(day);
        const dayEvents = events.filter(e => e.due_date === currentDayStr);
        const isCurrentDay = isSameDay(day, new Date());
        const isSelectedMonth = isSameMonth(day, monthStart);

        days.push(
          <div
            key={currentDayStr}
            className={`min-h-[140px] p-2 border-r border-b border-slate-200 transition-colors ${
              !isSelectedMonth ? 'bg-slate-50/50' : 'bg-white'
            } ${isCurrentDay ? 'bg-indigo-50/30' : ''}`}
          >
            <div className="flex justify-between items-start mb-1">
              <span className={`text-sm font-semibold rounded-full w-7 h-7 flex items-center justify-center transition-colors ${
                isCurrentDay 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : isSelectedMonth ? 'text-slate-700' : 'text-slate-300'
              }`}>
                {format(day, 'd')}
              </span>
              {dayEvents.length > 3 && (
                <button
                  onClick={() => setExpandedDay(currentDayCopy)}
                  className="px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-all border border-indigo-100 shadow-sm"
                >
                  +{dayEvents.length - 3}
                </button>
              )}
            </div>
            <div className="space-y-1 overflow-y-hidden overflow-x-hidden max-h-[100px]">
              {dayEvents.slice(0, 3).map(event => renderEvent(event, true))}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }

    return (
      <div className="flex flex-col bg-white border-l border-t border-slate-200 shadow-xl rounded-xl overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {weekdayHeaders.map(d => (
            <div key={d} className="py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>
        {rows}
      </div>
    );
  };

  const renderWeekView = () => {
    const startDate = startOfWeek(currentDate);
    const days = [];
    const weekdayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < 7; i++) {
      const day = addDays(startDate, i);
      const currentDayStr = format(day, 'yyyy-MM-dd');
      const dayEvents = events.filter(e => e.due_date === currentDayStr);
      const isCurrentDay = isSameDay(day, new Date());

      days.push(
        <div
          key={currentDayStr}
          className={`min-h-[500px] p-4 border-r border-slate-200 transition-colors ${
            isCurrentDay ? 'bg-indigo-50/30' : 'bg-white'
          }`}
        >
          <div className="flex flex-col items-center mb-6">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
              {weekdayHeaders[i]}
            </span>
            <span className={`text-xl font-black rounded-xl w-10 h-10 flex items-center justify-center transition-all ${
              isCurrentDay 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-110' 
                : 'text-slate-700 bg-slate-50'
            }`}>
              {format(day, 'd')}
            </span>
          </div>
          <div className="space-y-2">
            {dayEvents.map(event => renderEvent(event, false))}
            {dayEvents.length === 0 && (
              <div className="py-8 text-center">
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
                </div>
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">No Events</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-7 bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden">
        {days}
      </div>
    );
  };

  const renderDayView = () => {
    const currentDayStr = format(currentDate, 'yyyy-MM-dd');
    const dayEvents = events.filter(e => e.due_date === currentDayStr);
    const isCurrentDay = isSameDay(currentDate, new Date());

    return (
      <div className="bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden min-h-[500px]">
        <div className="p-8 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className={`text-4xl font-black rounded-2xl w-20 h-20 flex items-center justify-center shadow-2xl transition-all ${
              isCurrentDay 
                ? 'bg-indigo-600 text-white shadow-indigo-200' 
                : 'text-slate-800 bg-white border border-slate-200'
            }`}>
              {format(currentDate, 'd')}
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900 leading-tight">
                {format(currentDate, 'EEEE')}
              </h3>
              <p className="text-slate-500 font-medium tracking-wide">
                {format(currentDate, 'MMMM d, yyyy')}
              </p>
            </div>
          </div>
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm text-center">
            <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Deadlines</span>
            <span className="text-2xl font-black text-indigo-600">{dayEvents.length}</span>
          </div>
        </div>
        <div className="p-8 max-w-2xl mx-auto space-y-4">
          {dayEvents.map(event => renderEvent(event, false))}
          {dayEvents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
              <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mb-4">
                <CalendarIcon className="text-slate-200" size={32} />
              </div>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Quiet Day</p>
              <p className="text-slate-300 text-xs mt-1 font-medium">No deadlines or events scheduled</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full animate-in fade-in duration-500">
      <div className="flex flex-col gap-6">

        {showHeader && renderHeader()}

        {loading ? (
          <div className="flex flex-col items-center justify-center h-[500px] bg-white rounded-2xl border border-slate-100 shadow-sm gap-4">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <CalendarIcon size={16} className="text-indigo-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500 animate-pulse">Synchronizing deadlines...</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {viewMode === 'month' && renderMonthView()}
            {viewMode === 'week' && renderWeekView()}
            {viewMode === 'day' && renderDayView()}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-6 px-6 py-4 bg-slate-50 rounded-xl border border-slate-200/50">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#EF4444] shadow-sm"></span>
            <span className="text-[11px] font-semibold text-slate-600 uppercase">Milestones</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#8B5CF6] shadow-sm"></span>
            <span className="text-[11px] font-semibold text-slate-600 uppercase">Project End</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#10B981] shadow-sm"></span>
            <span className="text-[11px] font-semibold text-slate-600 uppercase">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#3B82F6] shadow-sm"></span>
            <span className="text-[11px] font-semibold text-slate-600 uppercase">Active Tasks</span>
          </div>
        </div>
      </div>

      {/* Popover */}
      {hoveredEvent && (
        <div 
          className="fixed z-[11000] pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2 animate-in fade-in zoom-in duration-200"
          style={{ left: popoverPos.x, top: popoverPos.y - 8 }}
        >
          <div className="bg-white/95 backdrop-blur-md border border-slate-200 shadow-2xl rounded-xl p-4 w-64 ring-1 ring-slate-900/5">
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {hoveredEvent.sourceType} Details
              </span>
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: hoveredEvent.color }}
              ></div>
            </div>
            
            <h3 className="font-bold text-slate-900 text-sm leading-tight mb-2">
              {hoveredEvent.title}
            </h3>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[11px] text-slate-600">
                <CalendarIcon size={12} className="text-slate-400" />
                <span>
                  {hoveredEvent.start_date ? `${hoveredEvent.start_date} → ` : ''}
                  {hoveredEvent.due_date}
                </span>
              </div>

              {hoveredEvent.assignee_name && (
                <div className="flex items-center gap-2 text-[11px] text-slate-600">
                  <div className="w-4 h-4 rounded-full bg-indigo-100 flex items-center justify-center text-[8px] font-bold text-indigo-600">
                    {hoveredEvent.assignee_name.charAt(0)}
                  </div>
                  <span>Owner: {hoveredEvent.assignee_name}</span>
                </div>
              )}

              {hoveredEvent.team_name && (
                <div className="flex items-center gap-2 text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-400">Team:</span>
                  <span>{hoveredEvent.team_name}</span>
                </div>
              )}

              {hoveredEvent.is_stuck && (
                <div className="flex items-center gap-2 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
                  <AlertTriangle size={12} />
                  <span>Marked as STUCK</span>
                </div>
              )}

              {hoveredEvent.class_name && (
                <div className="flex items-center gap-2 text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-400">Class:</span>
                  <span>{hoveredEvent.class_name}</span>
                </div>
              )}
            </div>

            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-r border-b border-slate-200 rotate-45"></div>
          </div>
        </div>
      )}

      {/* Day Details Overlay */}
      {expandedDay && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in slide-in-from-bottom-4 duration-300">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {format(expandedDay, 'EEEE, MMMM d')}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {events.filter(e => e.due_date === format(expandedDay!, 'yyyy-MM-dd')).length} events scheduled
                </p>
              </div>
              <button 
                onClick={() => setExpandedDay(null)}
                className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-slate-600 transition-colors border border-transparent hover:border-slate-200"
              >
                <ChevronRight className="rotate-90" size={20} />
              </button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
              {events
                .filter(e => e.due_date === format(expandedDay!, 'yyyy-MM-dd'))
                .map(event => (
                  <div
                    key={event.id}
                    onMouseEnter={(e) => handleMouseEnter(e, event)}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => handleEventClick(event)}
                    style={{ borderLeftColor: event.color }}
                    className="group relative p-3 rounded-xl border border-slate-100 border-l-4 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 mb-1">{event.title}</h4>
                      <div className="flex gap-2">
                        {event.team_name && (
                          <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                            {event.team_name}
                          </span>
                        )}
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                          {event.sourceType}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleExportSingle(e, event.id)}
                      className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"
                    >
                      <Download size={18} />
                    </button>
                  </div>
                ))}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setExpandedDay(null)}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
          {/* Backdrop Click */}
          <div className="absolute inset-0 -z-10" onClick={() => setExpandedDay(null)}></div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;

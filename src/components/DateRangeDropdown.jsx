import React, { useState, useEffect, useRef } from 'react';

export default function DateRangeDropdown({
  currentPeriod,
  currentPeriodLabel,
  currentCustomStartDate,
  currentCustomEndDate,
  onPeriodChange
}) {
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  // Calendar states
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth());
  const [tempFrom, setTempFrom] = useState(null);
  const [tempTo, setTempTo] = useState(null);

  const periodRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (periodRef.current && !periodRef.current.contains(event.target)) {
        setPeriodDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePeriodSelect = (val, label) => {
    onPeriodChange(val, label, '', '');
    setPeriodDropdownOpen(false);
  };

  const handleApplyCustom = () => {
    if (!tempFrom) return;
    const start = tempFrom;
    const end = tempTo || tempFrom;
    
    const formatDateLabel = (str) => {
      const parts = str.split('-');
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    const label = `${formatDateLabel(start)} - ${formatDateLabel(end)}`;

    onPeriodChange('custom', label, start, end);
    setPeriodDropdownOpen(false);
  };

  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const calendarMonthName = () => MONTH_NAMES[calendarMonth];

  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();
  const formatDateString = (y, m, d) => {
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(prev => prev - 1);
    } else {
      setCalendarMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(prev => prev + 1);
    } else {
      setCalendarMonth(prev => prev + 1);
    }
  };

  const handleDateClick = (dateStr) => {
    if (!tempFrom || (tempFrom && tempTo)) {
      setTempFrom(dateStr);
      setTempTo(null);
    } else {
      if (dateStr < tempFrom) {
        setTempFrom(dateStr);
      } else {
        setTempTo(dateStr);
      }
    }
  };

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
    const firstDayIndex = getFirstDayOfMonth(calendarYear, calendarMonth);
    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(formatDateString(calendarYear, calendarMonth, d));
    }

    return days.map((dateStr, idx) => {
      if (!dateStr) return <div key={`empty-${idx}`} className="h-7 w-7"></div>;

      const isFrom = tempFrom === dateStr;
      const isTo = tempTo === dateStr;
      const isBetween = tempFrom && tempTo && dateStr > tempFrom && dateStr < tempTo;

      let btnClass = "h-7 w-7 flex items-center justify-center font-mono-data text-[11px] transition-all relative ";

      if (isFrom && isTo) {
        btnClass += "bg-primary text-on-primary rounded-full font-bold";
      } else if (isFrom) {
        btnClass += `bg-primary text-on-primary font-bold ${tempTo ? 'rounded-l-full' : 'rounded-full'}`;
      } else if (isTo) {
        btnClass += "bg-primary text-on-primary font-bold rounded-r-full";
      } else if (isBetween) {
        btnClass += "bg-primary/15 text-primary rounded-none";
      } else {
        btnClass += "hover:bg-surface-container-low text-on-surface rounded-full";
      }

      const dayNum = parseInt(dateStr.split('-')[2]);

      return (
        <button
          key={dateStr}
          type="button"
          onClick={() => handleDateClick(dateStr)}
          className={btnClass}
        >
          {dayNum}
        </button>
      );
    });
  };

  return (
    <div className="relative" ref={periodRef}>
      <button 
        type="button"
        onClick={() => {
          setPeriodDropdownOpen(!periodDropdownOpen);
          setShowCalendar(currentPeriod === 'custom');
        }}
        className="flex items-center gap-1.5 px-4 py-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-sm text-xs font-semibold hover:shadow-md transition-all animate-fade-in text-on-surface"
      >
        <span className="material-symbols-outlined text-[18px] text-on-surface-variant">calendar_today</span>
        <span>{currentPeriodLabel}</span>
        <span className="material-symbols-outlined text-[18px] text-on-surface-variant">arrow_drop_down</span>
      </button>

      {periodDropdownOpen && (
        <div className="absolute right-0 mt-2 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden text-xs min-w-[160px]">
          {!showCalendar ? (
            <div className="p-2 flex flex-col gap-1">
              <div className="px-3 py-1 text-[10px] uppercase font-bold text-on-surface-variant/60 tracking-wider">Presets</div>
              <button type="button" onClick={() => handlePeriodSelect('today', 'Today')} className={`w-full text-left px-3 py-1.5 rounded-lg transition-colors ${currentPeriod === 'today' ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-surface-container-low'}`}>Today</button>
              <button type="button" onClick={() => handlePeriodSelect('this_week', 'This Week')} className={`w-full text-left px-3 py-1.5 rounded-lg transition-colors ${currentPeriod === 'this_week' ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-surface-container-low'}`}>This Week</button>
              <button type="button" onClick={() => handlePeriodSelect('this_month', 'This Month')} className={`w-full text-left px-3 py-1.5 rounded-lg transition-colors ${currentPeriod === 'this_month' ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-surface-container-low'}`}>This Month</button>
              <button type="button" onClick={() => handlePeriodSelect('all', 'All Time')} className={`w-full text-left px-3 py-1.5 rounded-lg transition-colors ${currentPeriod === 'all' ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-surface-container-low'}`}>All Time</button>
              <button 
                type="button"
                onClick={() => {
                  setShowCalendar(true);
                  if (!tempFrom && currentCustomStartDate) {
                    setTempFrom(currentCustomStartDate);
                    setTempTo(currentCustomEndDate);
                  }
                }} 
                className={`w-full text-left px-3 py-1.5 rounded-lg transition-colors border-t border-outline-variant/20 mt-1 font-semibold text-primary ${currentPeriod === 'custom' ? 'bg-primary/15' : 'hover:bg-surface-container-low'}`}
              >
                Custom Range
              </button>
            </div>
          ) : (
            <div className="w-[280px] p-3 flex flex-col gap-3">
              <div className="flex items-center gap-1.5 -ml-1 border-b border-outline-variant/30 pb-2 mb-1">
                <button
                  type="button"
                  onClick={() => setShowCalendar(false)}
                  className="p-1 hover:bg-surface-container-low rounded-full flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[16px] text-on-surface-variant">arrow_back</span>
                </button>
                <span className="font-semibold text-xs text-on-surface">Select Custom Range</span>
              </div>

              <div className="flex items-center justify-between mb-1">
                <button type="button" onClick={handlePrevMonth} className="p-1 hover:bg-surface-container-low rounded-full">
                  <span className="material-symbols-outlined text-[16px] text-on-surface-variant">chevron_left</span>
                </button>
                <span className="font-bold text-xs text-on-surface">
                  {calendarMonthName()} {calendarYear}
                </span>
                <button type="button" onClick={handleNextMonth} className="p-1 hover:bg-surface-container-low rounded-full">
                  <span className="material-symbols-outlined text-[16px] text-on-surface-variant">chevron_right</span>
                </button>
              </div>

              <div className="grid grid-cols-7 gap-y-1 text-center font-bold text-[10px] text-on-surface-variant/70 mb-0.5">
                <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
              </div>

              <div className="grid grid-cols-7 gap-y-1 justify-items-center">
                {generateCalendarDays()}
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-outline-variant/30 text-[10px]">
                <div className="flex items-center justify-between text-on-surface-variant">
                  <span>From: <strong className="text-on-surface font-mono-data">{tempFrom || 'Select'}</strong></span>
                  <span>To: <strong className="text-on-surface font-mono-data">{tempTo || 'Select'}</strong></span>
                </div>
                <div className="flex items-center justify-end gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setTempFrom(null);
                      setTempTo(null);
                    }}
                    className="px-2.5 py-1 border border-outline-variant rounded-md hover:bg-surface-container-low text-on-surface transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    disabled={!tempFrom}
                    onClick={handleApplyCustom}
                    className="px-3.5 py-1 bg-primary text-on-primary font-semibold rounded-md hover:bg-primary-container disabled:opacity-50 transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

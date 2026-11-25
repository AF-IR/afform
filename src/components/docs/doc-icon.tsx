import {
  BookOpen, Rocket, ListChecks, ShieldCheck, FileSpreadsheet, Sparkles,
  GitBranch, Lock, Users, KeyRound, Timer, GraduationCap, Shuffle,
  BarChart2, Link2, QrCode, CalendarClock, FileUp, Mail, Star,
  Type, AlignRight, CircleDot, CheckSquare, ChevronDown, ToggleLeft,
  SlidersHorizontal, Hash, Calendar, Clock, Upload, Grid3X3, Info, Minus,
  MessageSquare, ClipboardList, Bot, Eye, FileJson, Table2, Ban, Fingerprint,
  Gauge, HelpCircle, Wrench, Compass, Lightbulb, Image, Sigma,
  type LucideIcon,
} from 'lucide-react'

/** Central icon-name → component map shared by docs and use-case pages. */
const ICONS: Record<string, LucideIcon> = {
  BookOpen, Rocket, ListChecks, ShieldCheck, FileSpreadsheet, Sparkles,
  GitBranch, Lock, Users, KeyRound, Timer, GraduationCap, Shuffle,
  BarChart2, Link2, QrCode, CalendarClock, FileUp, Mail, Star,
  Type, AlignRight, CircleDot, CheckSquare, ChevronDown, ToggleLeft,
  SlidersHorizontal, Hash, Calendar, Clock, Upload, Grid3X3, Info, Minus,
  MessageSquare, ClipboardList, Bot, Eye, FileJson, Table2, Ban, Fingerprint,
  Gauge, HelpCircle, Wrench, Compass, Lightbulb, Image, Sigma,
}

export function DocIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? BookOpen
  return <Icon className={className} aria-hidden />
}

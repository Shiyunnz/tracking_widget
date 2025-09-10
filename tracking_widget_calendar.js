// ===================================================
// USER CONFIGURATION
// ===================================================
const EVENT_NAME = "Daily Habit Tracker";  
// 更新：统计区间改为 2025-09-01 至 2025-12-31
const START_DATE = new Date(2025, 8, 1);   // 月份 0 基：8 => 9 月
const END_DATE = new Date(2025, 11, 31);   // 11 => 12 月 31 日

const BG_IMAGE_URL = "";
const BG_COLOR = "#222222"; // 深灰背景
const BG_OVERLAY_OPACITY = 0.5;

const COLOR_FILLED = new Color("#ffffff");
const COLOR_UNFILLED = new Color("#ffffff", 0.4);
const COLOR_TODAY_DONE = new Color("#ff4444");   // 今日已完成 → 红色
const COLOR_TODAY_TODO = new Color("#ffaa00");   // 今日未完成 → 橙色

const PADDING = 8;
const CIRCLE_SIZE = 6;
const CIRCLE_SPACING = 4;
const TEXT_SPACING = 8;
const DOT_SHIFT_LEFT = 2;
const YEAR_OFFSET = DOT_SHIFT_LEFT - 2;
const DAYS_LEFT_OFFSET = 0;

// 检查机制改为：判断今天是否仍有未完成的待办（根据提醒的 dueDate 在今日范围内）
// 可选：限定某个列表名称（留空表示所有列表）
const TARGET_LIST_NAME = ""; // 示例: "Daily Tasks"；空=全部提醒

// ===================================================
// 缓存设置
// ===================================================
const FILE_MGR = FileManager.local();
const CACHE_FILE = FILE_MGR.joinPath(FILE_MGR.documentsDirectory(), "daily_habit_cache.json");

function loadCache() {
  try {
    if (FILE_MGR.fileExists(CACHE_FILE)) {
      const content = FILE_MGR.readString(CACHE_FILE);
      return JSON.parse(content);
    }
  } catch(e) { console.log("[DailyHabit] 读取缓存失败:" + e); }
  return null;
}

function saveCache(data) {
  try {
    FILE_MGR.writeString(CACHE_FILE, JSON.stringify(data));
  } catch(e) { console.log("[DailyHabit] 写入缓存失败:" + e); }
}

// ===================================================
// HELPER: 检查今日是否还有未完成提醒（有未完成 => dailyDone = false）
// ===================================================
async function checkDailyReminders(debug = true) {
  const start = new Date(); start.setHours(0,0,0,0)
  const end = new Date(start); end.setDate(start.getDate() + 1)
  let calendars = null
  if (TARGET_LIST_NAME) {
    try {
      const cal = await Calendar.forRemindersByTitle(TARGET_LIST_NAME)
      if (cal) calendars = [cal]; else console.log('[DailyHabit] 未找到指定列表，改为全部')
    } catch(e) { console.log('[DailyHabit] 获取列表失败: ' + e) }
  }
  let reminders
  try {
    reminders = await Reminder.all(calendars)
  } catch(e) {
    console.log('[DailyHabit] Reminder.all 失败: ' + e)
    const cache = loadCache();
    if (cache && typeof cache.dailyDone === 'boolean') {
      console.log('[DailyHabit] 使用缓存 dailyDone=' + cache.dailyDone)
      return cache.dailyDone
    }
    return false
  }
  // 选取今日范围内的有截止时间的任务
  const todayReminders = reminders.filter(r => r.dueDate && r.dueDate >= start && r.dueDate < end)
  const incomplete = todayReminders.filter(r => !r.isCompleted)
  const dailyDone = incomplete.length === 0 && todayReminders.length > 0
  if (debug) {
    console.log('[DailyHabit] === 今日提醒检查 ===')
    console.log(`[DailyHabit] 今日所有匹配数量: ${todayReminders.length}`)
    console.log(`[DailyHabit] 未完成数量: ${incomplete.length}`)
    incomplete.slice(0,15).forEach((r,i)=>{
      console.log(`  未完成#${i+1}: ${r.title || '(无标题)'} @${r.dueDate.toLocaleTimeString()}`)
    })
    console.log(`[DailyHabit] dailyDone(无未完成且至少有1个今日任务): ${dailyDone}`)
  }
  saveCache({ dailyDone, timestamp: Date.now(), countToday: todayReminders.length, incomplete: incomplete.length })
  return dailyDone
}

const dailyDone = await checkDailyReminders(true)
console.log(`[DailyHabit] dailyDone 结果: ${dailyDone}`)

// ===================================================
// 原本的点阵逻辑
// ===================================================
const NOW = new Date()
const MS_PER_DAY = 86400000
const DAYS_TOTAL = Math.round((END_DATE - START_DATE) / MS_PER_DAY) + 1
const DAYS_SINCE_START = Math.max(0, Math.round((NOW - START_DATE) / MS_PER_DAY))
const DAYS_UNTIL_END = Math.max(0, Math.round((END_DATE - NOW) / MS_PER_DAY))

const widget = new ListWidget()
const overlay = new LinearGradient()
overlay.locations = [0,1]
overlay.colors = [new Color(BG_COLOR, BG_OVERLAY_OPACITY), new Color(BG_COLOR, BG_OVERLAY_OPACITY)]
widget.backgroundGradient = overlay

const WIDGET_WIDTH = 320
const AVAILABLE_WIDTH = WIDGET_WIDTH - (2 * PADDING)
const TOTAL_CIRCLE_WIDTH = CIRCLE_SIZE + CIRCLE_SPACING
const COLUMNS = Math.floor(AVAILABLE_WIDTH / TOTAL_CIRCLE_WIDTH)
const ROWS = Math.ceil(DAYS_TOTAL / COLUMNS)

widget.setPadding(12, PADDING, 12, PADDING)
const gridContainer = widget.addStack()
gridContainer.layoutVertically()
const gridStack = gridContainer.addStack()
gridStack.layoutVertically()
gridStack.spacing = CIRCLE_SPACING

for (let row = 0; row < ROWS; row++) {
  const rowStack = gridStack.addStack()
  rowStack.layoutHorizontally()
  rowStack.addSpacer(DOT_SHIFT_LEFT)
  
  for (let col = 0; col < COLUMNS; col++) {
    const day = row * COLUMNS + col + 1
    if (day > DAYS_TOTAL) continue

    const circle = rowStack.addText("●")
    circle.font = Font.systemFont(CIRCLE_SIZE)
    
    if (day < DAYS_SINCE_START + 1) {
      circle.textColor = COLOR_FILLED
    } else {
      circle.textColor = COLOR_UNFILLED
    }

    // 特别标记今天
    if (day === DAYS_SINCE_START + 1) {
      circle.textColor = dailyDone ? COLOR_TODAY_DONE : COLOR_TODAY_TODO
    }
    
    if (col < COLUMNS - 1) rowStack.addSpacer(CIRCLE_SPACING)
  }
}

widget.addSpacer(TEXT_SPACING)
const footer = widget.addStack()
footer.layoutHorizontally()
const eventText = footer.addText(EVENT_NAME)
eventText.font = new Font("Menlo-Bold", 12)
eventText.textColor = COLOR_FILLED
footer.addSpacer()
const daysLeft = footer.addText(`${DAYS_UNTIL_END} days left`)
daysLeft.font = new Font("Menlo", 12)
daysLeft.textColor = COLOR_UNFILLED

// 上次刷新时间显示 & 未完成任务摘要（若需要，可以简单从缓存复用）
const metaStack = widget.addStack()
metaStack.layoutHorizontally()
metaStack.spacing = 6
metaStack.addSpacer()
const cache = loadCache()
if (cache && cache.timestamp) {
  const d = new Date(cache.timestamp)
  const timeText = metaStack.addText(`${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`)
  timeText.font = Font.systemFont(10)
  timeText.textColor = COLOR_UNFILLED
}
metaStack.addSpacer()

// 动态计算下次刷新：
// 逻辑：
// 1. 如果今天任务未完成且当前时间 < 23:00 → 10 分钟后
// 2. 如果已完成 → 第二天 00:05
// 3. 如果接近午夜（>=23:00）且未完成 → 30 分钟后或第二天00:05（取较早合理值）
// 4. 保护：最小间隔 5 分钟，最大间隔 6 小时
function computeNextRefresh() {
  const now = new Date()
  let target
  if (!dailyDone) {
    if (now.getHours() < 23) {
      target = new Date(now.getTime() + 10 * 60 * 1000)
    } else {
      // 23 点后，给 30 分钟或次日 00:05
      const halfHour = new Date(now.getTime() + 30 * 60 * 1000)
      const nextDay = new Date(now)
      nextDay.setDate(now.getDate() + 1)
      nextDay.setHours(0,5,0,0)
      target = halfHour < nextDay ? halfHour : nextDay
    }
  } else {
    const nextDay = new Date(now)
    nextDay.setDate(now.getDate() + 1)
    nextDay.setHours(0,5,0,0)
    target = nextDay
  }
  // 约束
  const minGap = new Date(Date.now() + 5 * 60 * 1000)
  const maxGap = new Date(Date.now() + 6 * 60 * 60 * 1000)
  if (target < minGap) target = minGap
  if (target > maxGap) target = maxGap
  return target
}

try {
  const nextRefresh = computeNextRefresh()
  widget.refreshAfterDate = nextRefresh
  console.log('[DailyHabit] 设置下次刷新: ' + nextRefresh.toLocaleString())
} catch(e) { console.log('[DailyHabit] 设置 refreshAfterDate 失败: ' + e) }

if (config.runsInWidget) {
  Script.setWidget(widget)
} else {
  widget.presentMedium()
}
Script.complete()
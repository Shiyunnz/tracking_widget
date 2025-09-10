// BACKUP of tracking_widget.js before calendar-reminder today check refactor
// Timestamp: 2025-09-10

// ===================================================
// USER CONFIGURATION
// ===================================================
const EVENT_NAME = "Daily Habit Tracker";  
// 更新：统计区间改为 2025-09-01 至 2025-12-31
const START_DATE = new Date(2025, 8, 1);   // 月份 0 基：8 => 9 月
const END_DATE = new Date(2025, 11, 31);   // 11 => 12 月 31 日

const BG_IMAGE_URL = "";
const BG_COLOR = "#406260";
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

// 若要仅检测某个提醒列表全部是否完成，填入列表名称；为空则使用原来的 #daily + 今日 筛选逻辑
const REMINDER_LIST_NAME = "Daily Tasks"; // 例如: "Daily" 或 "习惯"，留空表示使用标签+日期方式

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
// HELPER: 检查今日 #daily 提醒事项是否完成 / 或列表全部完成
// ===================================================
async function checkDailyReminders(debug = true) {
  let all;
  try {
    if (REMINDER_LIST_NAME) {
      const cal = await Calendar.forRemindersByTitle(REMINDER_LIST_NAME)
      if (!cal) {
        console.log(`[DailyHabit] 未找到列表: ${REMINDER_LIST_NAME}`)
        const cache = loadCache();
        if (cache && typeof cache.dailyDone === 'boolean') {
          console.log('[DailyHabit] 使用缓存 dailyDone=' + cache.dailyDone)
          return cache.dailyDone
        }
        return false
      }
      all = await Reminder.all([cal])
    } else {
      all = await Reminder.all()
    }
  } catch (e) {
    console.log('[DailyHabit] Reminder.all() 调用失败: ' + e)
    const cache = loadCache();
    if (cache && typeof cache.dailyDone === 'boolean') {
      console.log('[DailyHabit] 使用缓存 dailyDone=' + cache.dailyDone)
      return cache.dailyDone
    }
    return false
  }
  if (REMINDER_LIST_NAME) {
    if (debug) {
      console.log(`[DailyHabit] === 列表模式 调试开始 (${REMINDER_LIST_NAME}) ===`)
      console.log(`[DailyHabit] 列表任务数量: ${all.length}`)
    }
    if (all.length === 0) {
      if (debug) console.log('[DailyHabit] 列表为空 -> 视为未完成')
      return false
    }
    const allDone = all.every(r => r.isCompleted)
    if (debug) {
      all.slice(0,20).forEach((r,i)=>{
        console.log(`  #${i+1} ${r.isCompleted ? '✔' : '✗'} ${r.title || '(无标题)'} `)
      })
      console.log(`[DailyHabit] 列表全部完成: ${allDone}`)
      console.log('[DailyHabit] === 列表模式 调试结束 ===')
    }
    saveCache({ dailyDone: allDone, timestamp: Date.now() })
    return allDone
  } else {
    const today = new Date(); today.setHours(0,0,0,0)
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
    if (debug) {
      console.log('[DailyHabit] === 标签+日期模式 调试开始 ===')
      console.log(`[DailyHabit] 当前时间: ${new Date().toLocaleString()}`)
      console.log(`[DailyHabit] 今天 0 点: ${today.toLocaleString()}`)
      console.log(`[DailyHabit] 明天 0 点: ${tomorrow.toLocaleString()}`)
      console.log(`[DailyHabit] 全部提醒数量: ${all.length}`)
    }
    const daily = all.filter(r => {
      const due = r.dueDate
      return r.notes && r.notes.includes('#daily') && due && due >= today && due < tomorrow
    })
    if (debug) {
      console.log(`[DailyHabit] 今日 #daily 任务数量: ${daily.length}`)
      daily.forEach((r, idx) => {
        const dueStr = r.dueDate ? r.dueDate.toLocaleString() : '无截止'
        console.log(`  #${idx+1} 标题: ${r.title || '(无标题)'}`)
        console.log(`     dueDate: ${dueStr}`)
        console.log(`     isCompleted: ${r.isCompleted}`)
      })
    }
    if (daily.length === 0) {
      if (debug) console.log('[DailyHabit] 未找到今日 #daily 任务 → 视为未完成')
      return false
    }
    const allDone = daily.every(r => r.isCompleted)
    if (debug) {
      console.log(`[DailyHabit] 是否全部完成: ${allDone}`)
      console.log('[DailyHabit] === 标签+日期模式 调试结束 ===')
    }
    saveCache({ dailyDone: allDone, timestamp: Date.now() })
    return allDone
  }
}

const dailyDone = await checkDailyReminders(true)
console.log(`[DailyHabit] dailyDone 结果: ${dailyDone}`)

// (rest of original file content omitted for brevity in backup)

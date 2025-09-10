# Daily Habit Tracking Widgets (Scriptable)

Two Scriptable scripts:

1. `tracking_widget_calendar.js` (current primary)

   - Renders a dot grid from START_DATE to END_DATE (one dot per day)
   - Today’s dot color reflects whether all due reminders for today are completed:
     - Completed (all dueDate items today finished and at least one exists) → `COLOR_TODAY_DONE`
     - Incomplete (still pending, or none scheduled today) → `COLOR_TODAY_TODO`
   - Optional filtering by a specific reminders list: leave `TARGET_LIST_NAME` empty to scan all
   - Caching via `daily_habit_cache.json` plus adaptive refresh strategy
   - Footer displays: event name + days left + last refresh time

2. `tracking_widget_list.js` (legacy / backup)
   - Older logic: either a fixed `REMINDER_LIST_NAME` or `#daily` tag + today’s due date filter
   - Kept only for rollback/comparison

## Key Configuration (top of script)

| Variable                                     | Description                          |
| -------------------------------------------- | ------------------------------------ |
| `EVENT_NAME`                                 | Label shown at footer left           |
| `START_DATE` / `END_DATE`                    | Date range controlling total dots    |
| `BG_COLOR` / `BG_OVERLAY_OPACITY`            | Background overlay color & opacity   |
| `COLOR_FILLED`                               | Color for past/elapsed days          |
| `COLOR_UNFILLED`                             | Color for future days                |
| `COLOR_TODAY_DONE`                           | Today dot when all done              |
| `COLOR_TODAY_TODO`                           | Today dot when incomplete            |
| `TARGET_LIST_NAME` (calendar version)        | Specific reminders list; empty = all |
| `PADDING` / `CIRCLE_SIZE` / `CIRCLE_SPACING` | Layout / sizing controls             |

## Completion Logic (calendar version)

1. Compute today’s 00:00 → next day 00:00 range
2. Fetch reminders (all or filtered list)
3. Keep those whose `dueDate` falls inside today
4. If count > 0 and all `isCompleted === true` → `dailyDone = true` else `false`
5. Cache result: `{ dailyDone, timestamp, countToday, incomplete }`

> If you want “no tasks today” to count as done, change:
>
> ```js
> const dailyDone = incomplete.length === 0; // remove && todayReminders.length > 0
> ```

## Adaptive Refresh Strategy

Inside `computeNextRefresh()`:

- Incomplete & hour < 23 → +10 minutes
- Incomplete & hour ≥ 23 → +30 minutes or next 00:05 (earlier of the two)
- Completed → next day 00:05
- Enforced bounds: minimum +5 mins, maximum +6 hours (WidgetKit still decides real timing)

## Cache File

- Location: Scriptable documents dir (local) – `daily_habit_cache.json`
- Purpose: fallback state when Reminders API fails, avoiding color flicker

## Usage

1. Copy script into Scriptable
2. Adjust config values (dates, colors, list)
3. Run once to initialize cache & verify logs
4. Add a Scriptable widget on Home Screen and select the script
5. Wait for system refresh cycles or tap-run for immediate update

## Customization Examples

- Dot size: tweak `CIRCLE_SIZE` (and possibly `CIRCLE_SPACING`)
- Gradient background:
  ```js
  const overlay = new LinearGradient();
  overlay.locations = [0, 1];
  overlay.colors = [new Color("#111111"), new Color("#333333")];
  widget.backgroundGradient = overlay;
  ```
- Show date in timestamp:
  ```js
  `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
  ```
- Force refresh on tap:
  ```js
  widget.url = "scriptable://run/<ScriptName>";
  ```

## Debugging

- Run inside Scriptable; inspect console lines prefixed `[DailyHabit]`
- If widget hasn’t refreshed: manually run, or trigger via Shortcuts automation

## Rollback

Use `tracking_widget_list.js` if you need the older list/tag logic.

## References

- Inspiration: https://www.youtube.com/watch?v=Cu-IMFl37LA
- Reference code: https://raw.githubusercontent.com/jvscholz/website/refs/heads/master/assets/countdown_widget/countdown.js

---

Future ideas: show pending count, weekly completion rate, write to Health / Calendar, etc.

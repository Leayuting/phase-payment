# Supabase Edge Functions

這裡是 phase-payment 專案（Supabase project ref `knkpxeynkecfsmonmzvi`）用到的 Edge Function 原始碼備份，避免只存在單一台電腦上。

## 功能

- `notify-line/` — 有人新增請款申請時，推播訊息到 LINE 群組。由 `requests` 表上的 `trg_notify_new_request` trigger（pg_net）觸發。
- `scheduled-backup/` — 每天台灣時間凌晨 3 點（pg_cron job `daily-backup`），把 9 張表打包成 JSON 存進私有的 `backups` Storage bucket，並寫驗證紀錄到 `backup_log` 表；失敗會透過 LINE 發警告。
- `line-capture/` — 暫用工具，只在「換 LINE 通知群組」時重新部署，用來擷取新群組的 groupId，用完即刪除，平常不會部署在線上。

## 重新部署

這台電腦沒有安裝 Docker，用 standalone CLI（非 brew）搭配 `--use-api` 繞過 Docker：

```
export SUPABASE_ACCESS_TOKEN=<Supabase 個人 access token，在 supabase.com/dashboard/account/tokens 產生>
supabase functions deploy <function名稱> --project-ref knkpxeynkecfsmonmzvi \
  --workdir . --use-api --no-verify-jwt --yes
```

## Secrets

`LINE_CHANNEL_ACCESS_TOKEN`、`LINE_GROUP_ID` 存在 Supabase 專案的 Edge Function secrets 裡（`supabase secrets set` 設定），不在程式碼裡，這份備份不含這兩個值。要查目前的值只能透過 LINE Developers Console 重新產生 token、或找到目前使用中的群組重新擷取。

其他背景說明（LINE 官方帳號設定、換群組流程、備份系統設計理由）記錄在專案外部的 Claude 記憶檔案裡，不在這個 repo。

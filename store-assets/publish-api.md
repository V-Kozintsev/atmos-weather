# Выкладка в магазины через API

Скрипт `mobile/scripts/publish-store.cjs` выкладывает уже собранные и подписанные сборки:
- APK — в RuStore,
- AAB — в Google Play.

Тексты «Что нового» он берёт из `public/app-releases.json` для `versionCode` из `mobile/app.json`.

Ключи доступа хранятся **вне репозитория**, в той же папке, что и ключ подписи: `C:\Users\aurel\Documents\Atmos Release\`. Скрипт читает их сам и нигде не выводит. Не добавляйте их в Git, не пересылайте в чат и сделайте резервную копию вместе с `atmos-release.p12`.

## Google Play: сервисный аккаунт

1. Откройте [Google Cloud Console](https://console.cloud.google.com/) и создайте проект, например `atmos-publisher`, или выберите существующий.
2. Включите API: «APIs & Services» → «Library» → **Google Play Android Developer API** → «Enable».
3. Создайте сервисный аккаунт: «IAM & Admin» → «Service Accounts» → «Create service account», имя — `atmos-publisher`. Роли в Google Cloud ему не нужны.
4. Откройте этот аккаунт → «Keys» → «Add key» → «Create new key» → **JSON**. Сохраните скачанный файл как
   `C:\Users\aurel\Documents\Atmos Release\google-play-service-account.json`.
5. Выдайте доступ в [Play Console](https://play.google.com/console): «Пользователи и разрешения» → «Пригласить пользователей».
   - Укажите адрес сервисного аккаунта (вида `…@…iam.gserviceaccount.com`, он есть в JSON в поле `client_email`).
   - Во вкладке «Разрешения для приложения» добавьте «Погода и что надеть» и включите:
     - «Просмотр информации о приложении»;
     - «Выпуск приложений в тестовых треках»;
     - при желании «Выпуск в рабочей версии…» — это понадобится после одобрения доступа к рабочей версии.
   - Нажмите «Пригласить». Иногда доступ начинает работать не сразу, а через несколько часов.

## RuStore: ключ API

1. В [RuStore Console](https://console.rustore.ru/) откройте приложение → в меню слева **«API RuStore»** → создайте ключ.
2. Выберите приложение «Погода и что надеть» и отметьте методы:
   - получение списка приложений;
   - получение списка и статуса версий;
   - детали версии;
   - создание черновика;
   - удаление черновика;
   - загрузка APK;
   - отправка на модерацию.

   Методы, которые RuStore добавит позже, к уже созданному ключу сами не подключатся.
3. Консоль покажет **ID ключа** и **приватный ключ** — строку Base64. Приватный ключ показывается один раз. Сохраните оба значения в файл
   `C:\Users\aurel\Documents\Atmos Release\rustore-api-key.json`:

   ```json
   { "keyId": "ID ключа", "privateKey": "строка приватного ключа" }
   ```

Ограничения RuStore API:
- Сборку с **новым чувствительным разрешением** через API не принимают. Такую версию загружают в консоли и объявляют разрешение там, как это сделано в 3.0.13 с уведомлениями.
- В приложении одновременно может быть только один черновик. Если черновик уже есть, скрипт остановится. Удалить его и создать новый можно флагом `--replace-draft`.
- Тексты карточки (описания, «Что нового» и т. п.) новый черновик берёт из активной версии. Про скриншоты документация RuStore прямо не говорит, поэтому при первом запуске без `--submit` проверьте черновик в консоли.

## Проверка и выкладка

```powershell
# Проверить доступ к обоим магазинам — ничего не публикует
node mobile/scripts/publish-store.cjs check

# Пробный прогон: загрузить сборку и проверить выпуск без отправки
node mobile/scripts/publish-store.cjs google-play --track alpha
node mobile/scripts/publish-store.cjs rustore

# Выложить и отправить на проверку
node mobile/scripts/publish-store.cjs google-play --track alpha --submit
node mobile/scripts/publish-store.cjs rustore --submit
```

По умолчанию берутся файлы текущей версии из последней папки `Atmos Release\<версия>-<дата>`. Другой файл можно передать через `--file <путь>`.

Сборка и выкладка одной командой:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File mobile/scripts/release-android.ps1 -KeystorePath 'C:\Users\aurel\Documents\Atmos Release\atmos-release.p12' -KeyAlias atmos -PasswordFile 'C:\Users\aurel\Documents\Atmos Release\signing-password.txt' -Publish -Submit
```

Перед выкладкой должна быть запись новой версии в `public/app-releases.json`: из неё берутся тексты «Что нового». Для Google Play это до 500 символов, для RuStore до 5000. Скриншоты и описание карточки скрипт не меняет.

Тесты скрипта, без обращения к магазинам: `node --test mobile/scripts/publish-store.test.cjs`.

# Проверка подписи iframe (plg-238)

Сейчас `IntegrationSignGuard` работает только для наблюдения: всегда возвращает
`true`, в том числе при отсутствии подписи, неверном формате, ошибке проверки
или логирования. Он не выполняет сетевые запросы и не обращается к БД.

Источники: [SN-5378](https://linear.app/collabox/issue/SN-5378),
подзадача [QA-205](https://linear.app/collabox/issue/QA-205),
обсуждение [SN-5197](https://linear.app/collabox/issue/SN-5197)
и связанная задача [PLG-200](https://linear.app/collabox/issue/PLG-200).

## Варианты подписи

Значения конкатенируются как строки в указанном порядке, без разделителей,
сортировки, JSON или HMAC. Результат — MD5 в hex (32 символа).
`secret` — секрет приложения Senler, на беке `SENLER_CLIENT_SECRET`.
`INTEGRATION_SECRET` используется отдельным гвардом вебхука.

| Имя в логе | Формула | Источник |
| --- | --- | --- |
| `standard` | `MD5(user_id + group_id + context + secret)` | Целевой формат SN-5378, пример проверки QA-205 |
| `legacy_with_channel` | `MD5(user_id + group_id + context + channel_type_id + secret)` | Старый frontend Senler, Install.php, Liidex/ChatGPT из обсуждений |
| `legacy_without_context` | `MD5(user_id + group_id + secret)` | Старый backend из SN-5197 |

В Install.php в обсуждении упомянуты «4 параметра»: это четыре поля массива
(`user_id`, `group_id`, `context`, `channel_type_id`) плюс отдельно переданный
секрет. Это второй вариант таблицы, а не дополнительная формула.

Сначала проверяется `standard`, затем совместимые старые варианты. Для
вариантов с `context`/`channel_type_id` нужны их исходные значения: гвард
не угадывает отсутствующие поля и не меняет регистр/ведущие нули.
По задаче `channel_type_id` продолжает передаваться в query, но в целевой
подписи не участвует. Статус задачи в Linear не подтверждает, что единый
формат уже развёрнут во всех сервисах.

## Передача с фронтенда

Общий Axios-клиент `src/api/Backend/client.ts` перед каждым запросом читает
из URL iframe только `sign`, `user_id`, `group_id`, `context`, `channel_type_id`
и добавляет их в query, сохраняя бизнес-параметры и тело запроса.
`group_id` берётся именно из iframe: `senlerGroupId` в запросах шаблонов
может содержать внутренний UUID, который нельзя подставлять в подпись.

Клиент используется для всех запросов к `senlerGroups`, `integration`
и `integrationStepTemplates`, а также создания OAuth-сессий из iframe.
OAuth callbacks продолжают использовать `state`; запросы к внешнему Senler
не используют этот клиент. Гварды OAuth-маршрутов не добавлялись.

Бек читает query, а для совместимости также принимает поля в body и
`body.senlerSign` (старое имя в регистрации). Одна подпись без `user_id`
и `group_id` недостаточна: такой запрос получает `missing_user_or_group`.

## Маршруты и логи

- Все три маршрута `senlerGroups` и все четыре маршрута `integrationStepTemplates`.
- `DELETE integration/change-amocrm-account`.
- `GET integration/amocrm-workspace-info`.
- `GET` и `DELETE integration/AmoCrmErrors`.

`POST integration/botStepWebhook` сохраняет свой `IntegrationSecretGuard`.
RabbitMQ-обработчик не использует проверку iframe.

Каждая проверка пишет отдельное сообщение `SIGN SUCCESS` или `SIGN UNSUCCESS`
через существующий logger. Метаданные: `dryRun: true`, метод, путь без query,
`variant` при успехе или `reason` при неуспехе. Используется logger запроса
для сохранения `requestId`; сам гвард не логирует подпись или секрет.

Проверка подтверждает только совпадение подписи с переданными параметрами.
Это ещё не проверка прав на конкретный ресурс: перед включением блокировки
потребуется привязка подписанного `group_id` к запрошенной группе/шаблону,
а также решение о поддержке старых форматов.

## Проверки

Бек: `npm test -- --runInBand`, `npm run build`.
Тесты покрывают три формулы, невалидный ввод, отсутствие секрета, исключения,
все 11 HTTP-маршрутов и сохранение авторизации вебхука.

Фронт: `npm test`, `npm run build`.
Тесты используют реальные API-модули с локальным Axios adapter и проверяют
12 операций, сохранение тела/параметров, смену URL iframe, отсутствие подписи
и исключение OAuth callbacks/внешнего Axios.

# Optional PixiJS atmosphere / Необязательные эффекты PixiJS

Implemented 31 October 2026. This extends the [English build guide](build-guide.en.md) and [русское руководство](build-guide.ru.md). The CSS scene choreography and 1800 ms navigation remain the base experience.

## English

### What was added

- Desert: a softly masked heat shimmer over the landscape band.
- Ocean: small horizontal and vertical distortions below the horizon, suggesting moving water.
- The sky, headings, main objects and interface remain outside the effect. The shader outputs transparency outside its affected band, preserving the original image's sharpness there.

The effect is visible without searching for it: water displacement peaks at 7.5 CSS pixels horizontally and 2.6 vertically; heat shimmer peaks at 4 and 2.2 pixels. Band/edge masks reduce those maxima near boundaries. These values were increased after the initial 1–2px version proved too faint behind the foreground layers, then the desert amplitude was softened by about 20%. They do not turn the source pictures into physical water or a 3D simulation. No Three.js, particle system, bloom, or blur chain is used.

### Rendering architecture

`Atmosphere.jsx` observes the existing scene/navigation/visibility attributes. Only an eligible, settled desert or ocean scene schedules the dynamic import of `pixiAtmosphere.js`, after 350 ms. That delay applies to initial optional loading, not to slide navigation.

The module creates one `WebGLRenderer`, one canvas, one sprite and one custom Pixi filter. It explicitly registers `pixi.js/filters`, because automatic extension loading is disabled. Vertex and fragment shaders declare matching high precision for shared uniforms. Initialization/render failures retain the ordinary HTML image.

The desert and ocean `.world-camera` elements are now wrappers containing their original `<img>`. The same canvas is moved between those wrappers. Camera CSS transforms therefore move the original image and its enhancement together. Text and foreground objects remain separate HTML layers.

Each original image is decoded before becoming a texture; no duplicate artwork downloads or displacement-map downloads are required. The sprite uses a centered cover crop. Crop coordinates are passed to the shader so its horizon mask remains attached to the source image rather than a fixed screen coordinate. The current eligibility rule excludes the mobile crop; if you enable mobile rendering later, also reproduce its `62%` object position in the sprite geometry.

There is one filter stage: the sprite is rendered into an intermediate target, then the custom filter composites it into the canvas. This is not a claim of one GPU draw call. The fragment shader uses one source texture sample and analytic sine functions; its band and edge masks avoid distorting the entire frame.

### Performance policy

| Control | Current behavior |
| --- | --- |
| Initial loading | Pixi is absent from the initial application chunk and is not requested on Cloud nine |
| Rendering budget | Maximum 800,000 canvas pixels, 1280px width, 900px height; density never exceeds 1 |
| Frame rate | At most 30 render submissions per second, reduced to 20 under measured CPU pressure |
| During slide transitions | Canvas fades out; effect frame loop and Pixi housekeeping ticker stop |
| Other pause conditions | Menu open, story disabled/offscreen, hidden document, or non-effect scene |
| Conservative exclusions | Width ≤680px, coarse primary pointer, Save-Data, reported memory ≤4 GB, reduced motion |
| Sustained overload | Disable the optional renderer for this mount and retain the CSS/image experience |
| GPU/context failure | Remove the renderer and retain the original images |

The renderer's smoothed CPU submission time lowers the cap above 6 ms and disables the effect above 12 ms after warmup. The first five renders are excluded from that average to avoid treating shader compilation as sustained load. Every 150 renders, an average below 2 ms permits a return to 30 fps. Repeated animation-frame gaps over 80 ms also disable it. These heuristics are protective limits, not GPU timing or a universal device benchmark. The canvas and filter targets share the bounded pixel density; source textures still consume decoded image memory.

Pixi's system ticker is stopped with the effect because this is the site's only Pixi renderer. If adding another Pixi application, replace that global ownership assumption with coordinated ticker management. Cleanup cancels callbacks, disconnects observers, removes listeners, destroys owned textures/filter/container/renderer, and removes the canvas. A pending asynchronous setup is disposed if its React owner unmounts.

### Files and checks

- [Atmosphere.jsx](../src/Atmosphere.jsx): deferred loading, eligibility, lifecycle.
- [atmospherePolicy.js](../src/atmospherePolicy.js): pure eligibility and resolution rules.
- [pixiAtmosphere.js](../src/pixiAtmosphere.js): shader, renderer, crop, frame budget and disposal.
- [Policy tests](../scripts/atmosphere.test.mjs): render size on large/portrait displays, conservative opt-outs, and settled-scene gating.

```sh
node scripts/atmosphere.test.mjs
node scripts/scene-navigation.test.mjs
npm run build
```

Inspect `.worlds-stage[data-atmosphere]` and the canvas data attributes `frames`, `render-ms`, `fps-limit`, `visible`, and (on failure) `fallback-reason`. The counters update every 30 rendered frames. They expose diagnostics in the DOM, not an on-screen overlay. Check that the counter stops in the studio and during a transition, only one canvas exists after repeated scene changes, and images remain available when effects are excluded.

## Русский

### Что добавлено

- Пустыня: мягко ограниченное марево в области ландшафта.
- Море: небольшие горизонтальные и вертикальные искажения ниже горизонта, создающие ощущение движения воды.
- Небо, заголовки, главные объекты и интерфейс остаются вне эффекта. За пределами нужной области шейдер выводит прозрачность, сохраняя чёткость исходного изображения.

Эффект заметен без пристального поиска: максимальное смещение воды — 7,5 CSS-пикселя по горизонтали и 2,6 по вертикали; марева — 4 и 2,2 пикселя. Маски уменьшают эти значения у границ области. Амплитуда увеличена после проверки: первоначальные 1–2 пикселя терялись за передними слоями. Затем эффект пустыни смягчён примерно на 20%. Это не физическая симуляция воды и не преобразование изображения в 3D. Three.js, частицы, bloom и цепочки размытия не используются.

### Устройство отрисовки

`Atmosphere.jsx` наблюдает за существующими атрибутами сцены, навигации и видимости. Только остановившаяся пустынная или морская сцена на подходящем устройстве запускает отложенный импорт `pixiAtmosphere.js` через 350 мс. Эта задержка относится к первичной загрузке улучшения, а не к переходу между слайдами.

Модуль создаёт один `WebGLRenderer`, один canvas, один спрайт и один фильтр. `pixi.js/filters` регистрируется явно, поскольку автоматическая загрузка расширений отключена. Общие uniform-переменные в вершинном и фрагментном шейдерах имеют одинаковую высокую точность. При ошибке инициализации или отрисовки остаётся обычное HTML-изображение.

У пустыни и моря `.world-camera` теперь является контейнером исходного `<img>`. Один canvas перемещается между такими контейнерами. Поэтому CSS-камера двигает исходное изображение и улучшение согласованно. Текст и передние объекты остаются отдельными HTML-слоями.

Перед созданием текстуры изображение декодируется. Повторная загрузка графики или отдельной карты искажений не нужна. Спрайт повторяет центральную обрезку `cover`. Координаты обрезки передаются шейдеру, поэтому маска горизонта связана с исходником, а не с фиксированной точкой экрана. Мобильная версия исключена из этого режима; если включите её позже, перенесите её `object-position: 62%` и в геометрию спрайта.

Используется одна стадия фильтра: спрайт сначала попадает в промежуточную текстуру, затем фильтр переносит результат на canvas. Это не означает один GPU draw call. Фрагментный шейдер делает одно чтение исходной текстуры и использует синусы; маски области и краёв не позволяют деформировать весь кадр.

### Ограничения нагрузки

| Ограничение | Текущее поведение |
| --- | --- |
| Первичная загрузка | Pixi вынесен из основного JS-файла и не запрашивается на Cloud nine |
| Разрешение | Не больше 800 000 пикселей canvas, 1280px по ширине и 900px по высоте; плотность не выше 1 |
| Частота | До 30 отрисовок в секунду, снижение до 20 при измеренной нагрузке CPU |
| Переход между слайдами | Canvas исчезает; цикл эффекта и служебный ticker Pixi останавливаются |
| Дополнительная пауза | Открытое меню, история выключена/за экраном, скрытая вкладка, другая сцена |
| Консервативное отключение | Ширина ≤680px, основной coarse-указатель, Save-Data, сообщённая память ≤4 ГБ, уменьшение движения |
| Устойчивая перегрузка | Эффект отключается до пересоздания компонента, остаются CSS и изображения |
| Ошибка GPU/контекста | Renderer удаляется, исходные изображения продолжают работать |

Сглаженное время отправки отрисовки на CPU снижает частоту после 6 мс и отключает эффект после 12 мс с учётом прогрева. Первые пять кадров исключены из среднего, чтобы компиляция шейдера не считалась постоянной нагрузкой. Каждые 150 кадров среднее ниже 2 мс позволяет вернуться к 30 fps. Повторяющиеся интервалы animation-frame больше 80 мс также отключают эффект. Это защитные эвристики, а не измерение времени GPU и не гарантия для всех устройств. Canvas и промежуточная текстура ограничены одинаковой плотностью; исходные текстуры всё равно занимают память декодированных изображений.

Системный ticker Pixi останавливается вместе с эффектом, поскольку это единственный Pixi-renderer сайта. При добавлении другого Pixi-приложения понадобится согласованное управление ticker. Очистка отменяет callbacks, отключает наблюдателей, удаляет обработчики, освобождает текстуры/фильтр/контейнер/renderer и удаляет canvas. Незавершённая асинхронная инициализация освобождает результат, если React-компонент уже удалён.

### Файлы и проверка

- [Atmosphere.jsx](../src/Atmosphere.jsx): отложенная загрузка, условия включения и жизненный цикл.
- [atmospherePolicy.js](../src/atmospherePolicy.js): правила разрешения и ограничения размера.
- [pixiAtmosphere.js](../src/pixiAtmosphere.js): шейдер, renderer, обрезка, бюджет кадра и освобождение ресурсов.
- [Тесты ограничений](../scripts/atmosphere.test.mjs): большие/вертикальные экраны, отключение по настройкам и разрешение только для остановившейся сцены.

```sh
node scripts/atmosphere.test.mjs
node scripts/scene-navigation.test.mjs
npm run build
```

Для диагностики смотрите `.worlds-stage[data-atmosphere]` и атрибуты canvas: `frames`, `render-ms`, `fps-limit`, `visible`, а при сбое — `fallback-reason`. Счётчики обновляются раз в 30 отрисовок. Они находятся в DOM, а не в видимом интерфейсе. Проверяйте остановку счётчика в студии и на переходе, единственный canvas после повторных переключений и сохранение изображений при отключении эффекта.

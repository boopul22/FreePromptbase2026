-- Descriptive-unique slug rename (2026-07-12). Same rule as 2026-07-03/05/07: keep the MAIN
-- KEYWORD (couple prompt) at the START, make it unique with a short DESCRIPTIVE word from
-- the prompt's content — never a number, never a random code. These 11 came in with random
-- code suffixes and are approved (dates 2026-07-08..12). The other 2 in this batch
-- (romantic-couple-prompt, vintage-editorial-couple-prompt) already have descriptive slugs.
-- defer_foreign_keys lets us update referencing prompt_events/saves/likes in the same batch.
PRAGMA defer_foreign_keys = true;

-- dusk lakeside, matte-gray luxury convertible, black suit + backless gown, red taillights
UPDATE prompts       SET slug='couple-prompt-luxury-car'      WHERE slug='couple-prompt-nspwe4';
UPDATE prompt_events SET prompt_slug='couple-prompt-luxury-car'      WHERE prompt_slug='couple-prompt-nspwe4';
UPDATE prompt_saves  SET prompt_slug='couple-prompt-luxury-car'      WHERE prompt_slug='couple-prompt-nspwe4';
UPDATE prompt_likes  SET prompt_slug='couple-prompt-luxury-car'      WHERE prompt_slug='couple-prompt-nspwe4';

-- ivory saree, putting on an earring at an ornate vintage mirror, man watching from doorway
UPDATE prompts       SET slug='couple-prompt-vintage-mirror'  WHERE slug='couple-prompt-ixcel3';
UPDATE prompt_events SET prompt_slug='couple-prompt-vintage-mirror'  WHERE prompt_slug='couple-prompt-ixcel3';
UPDATE prompt_saves  SET prompt_slug='couple-prompt-vintage-mirror'  WHERE prompt_slug='couple-prompt-ixcel3';
UPDATE prompt_likes  SET prompt_slug='couple-prompt-vintage-mirror'  WHERE prompt_slug='couple-prompt-ixcel3';

-- old European town, cream vintage Vespa, yellow polka-dot romper, candid lip-gloss moment
UPDATE prompts       SET slug='couple-prompt-vespa-street'    WHERE slug='couple-prompt-nw3acr';
UPDATE prompt_events SET prompt_slug='couple-prompt-vespa-street'    WHERE prompt_slug='couple-prompt-nw3acr';
UPDATE prompt_saves  SET prompt_slug='couple-prompt-vespa-street'    WHERE prompt_slug='couple-prompt-nw3acr';
UPDATE prompt_likes  SET prompt_slug='couple-prompt-vespa-street'    WHERE prompt_slug='couple-prompt-nw3acr';

-- white sailing yacht bow deck, golden hour, white linen + halter midi dress
UPDATE prompts       SET slug='couple-prompt-yacht-deck'      WHERE slug='couple-prompt-tqwlz3';
UPDATE prompt_events SET prompt_slug='couple-prompt-yacht-deck'      WHERE prompt_slug='couple-prompt-tqwlz3';
UPDATE prompt_saves  SET prompt_slug='couple-prompt-yacht-deck'      WHERE prompt_slug='couple-prompt-tqwlz3';
UPDATE prompt_likes  SET prompt_slug='couple-prompt-yacht-deck'      WHERE prompt_slug='couple-prompt-tqwlz3';

-- golden-hour kiss in falling rain, roses hidden behind his back, vintage pink scooter
UPDATE prompts       SET slug='couple-prompt-rain-kiss'       WHERE slug='couple-prompt-55aqxj';
UPDATE prompt_events SET prompt_slug='couple-prompt-rain-kiss'       WHERE prompt_slug='couple-prompt-55aqxj';
UPDATE prompt_saves  SET prompt_slug='couple-prompt-rain-kiss'       WHERE prompt_slug='couple-prompt-55aqxj';
UPDATE prompt_likes  SET prompt_slug='couple-prompt-rain-kiss'       WHERE prompt_slug='couple-prompt-55aqxj';

-- heritage haveli archway, man tying a jasmine (mogra) strand around her ankle, lavender saree
UPDATE prompts       SET slug='couple-prompt-jasmine-anklet'  WHERE slug='couple-prompt-pfztt2';
UPDATE prompt_events SET prompt_slug='couple-prompt-jasmine-anklet'  WHERE prompt_slug='couple-prompt-pfztt2';
UPDATE prompt_saves  SET prompt_slug='couple-prompt-jasmine-anklet'  WHERE prompt_slug='couple-prompt-pfztt2';
UPDATE prompt_likes  SET prompt_slug='couple-prompt-jasmine-anklet'  WHERE prompt_slug='couple-prompt-pfztt2';

-- getting-ready bedroom scene, man helping drape her mustard-yellow silk saree
UPDATE prompts       SET slug='couple-prompt-saree-draping'   WHERE slug='couple-prompt-xeg00u';
UPDATE prompt_events SET prompt_slug='couple-prompt-saree-draping'   WHERE prompt_slug='couple-prompt-xeg00u';
UPDATE prompt_saves  SET prompt_slug='couple-prompt-saree-draping'   WHERE prompt_slug='couple-prompt-xeg00u';
UPDATE prompt_likes  SET prompt_slug='couple-prompt-saree-draping'   WHERE prompt_slug='couple-prompt-xeg00u';

-- carnival dip pose at dusk, illuminated ferris wheel in the background
UPDATE prompts       SET slug='couple-prompt-ferris-wheel'    WHERE slug='couple-prompt-7evkgu';
UPDATE prompt_events SET prompt_slug='couple-prompt-ferris-wheel'    WHERE prompt_slug='couple-prompt-7evkgu';
UPDATE prompt_saves  SET prompt_slug='couple-prompt-ferris-wheel'    WHERE prompt_slug='couple-prompt-7evkgu';
UPDATE prompt_likes  SET prompt_slug='couple-prompt-ferris-wheel'    WHERE prompt_slug='couple-prompt-7evkgu';

-- night ghat steps, clay kulhad cups of chai, warm fairy-light glow
UPDATE prompts       SET slug='couple-prompt-kulhad-chai'     WHERE slug='couple-prompt-f3ihua';
UPDATE prompt_events SET prompt_slug='couple-prompt-kulhad-chai'     WHERE prompt_slug='couple-prompt-f3ihua';
UPDATE prompt_saves  SET prompt_slug='couple-prompt-kulhad-chai'     WHERE prompt_slug='couple-prompt-f3ihua';
UPDATE prompt_likes  SET prompt_slug='couple-prompt-kulhad-chai'     WHERE prompt_slug='couple-prompt-f3ihua';

-- weathered orange haveli door, man fastening her blouse clasp, marigold garlands
UPDATE prompts       SET slug='couple-prompt-haveli-door'     WHERE slug='couple-prompt-hoeehg';
UPDATE prompt_events SET prompt_slug='couple-prompt-haveli-door'     WHERE prompt_slug='couple-prompt-hoeehg';
UPDATE prompt_saves  SET prompt_slug='couple-prompt-haveli-door'     WHERE prompt_slug='couple-prompt-hoeehg';
UPDATE prompt_likes  SET prompt_slug='couple-prompt-haveli-door'     WHERE prompt_slug='couple-prompt-hoeehg';

-- backlit close-up, interlaced hands, sunflower + pink carnation, stone balustrade
UPDATE prompts       SET slug='couple-prompt-sunflower'       WHERE slug='couple-prompt-tiyqfn';
UPDATE prompt_events SET prompt_slug='couple-prompt-sunflower'       WHERE prompt_slug='couple-prompt-tiyqfn';
UPDATE prompt_saves  SET prompt_slug='couple-prompt-sunflower'       WHERE prompt_slug='couple-prompt-tiyqfn';
UPDATE prompt_likes  SET prompt_slug='couple-prompt-sunflower'       WHERE prompt_slug='couple-prompt-tiyqfn';

-- sharing one clear transparent umbrella in gentle rain, garden bokeh (added later same day)
UPDATE prompts       SET slug='couple-prompt-clear-umbrella'  WHERE slug='couple-prompt-qghtff';
UPDATE prompt_events SET prompt_slug='couple-prompt-clear-umbrella'  WHERE prompt_slug='couple-prompt-qghtff';
UPDATE prompt_saves  SET prompt_slug='couple-prompt-clear-umbrella'  WHERE prompt_slug='couple-prompt-qghtff';
UPDATE prompt_likes  SET prompt_slug='couple-prompt-clear-umbrella'  WHERE prompt_slug='couple-prompt-qghtff';

-- illuminated vintage carousel at dusk, film camera photographing her (added later same day)
UPDATE prompts       SET slug='couple-prompt-carousel'        WHERE slug='couple-prompt-wxq2cl';
UPDATE prompt_events SET prompt_slug='couple-prompt-carousel'        WHERE prompt_slug='couple-prompt-wxq2cl';
UPDATE prompt_saves  SET prompt_slug='couple-prompt-carousel'        WHERE prompt_slug='couple-prompt-wxq2cl';
UPDATE prompt_likes  SET prompt_slug='couple-prompt-carousel'        WHERE prompt_slug='couple-prompt-wxq2cl';

-- Remove the retired text-prompt library and its dependent interaction data.
-- The text category is deleted last so no future prompt can reference it.
DELETE FROM prompt_events
WHERE prompt_slug IN (SELECT slug FROM prompts WHERE category = 'text');

DELETE FROM prompt_likes
WHERE prompt_slug IN (SELECT slug FROM prompts WHERE category = 'text');

DELETE FROM prompt_saves
WHERE prompt_slug IN (SELECT slug FROM prompts WHERE category = 'text');

DELETE FROM prompts WHERE category = 'text';
DELETE FROM prompt_categories WHERE slug = 'text';

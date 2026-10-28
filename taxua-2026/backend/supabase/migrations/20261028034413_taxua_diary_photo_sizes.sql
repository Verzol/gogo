-- Add bounded display sizes without rewriting any crew content or permissions.
-- Preserve the complete deployed gateway and add only a metadata boundary check.
do $migration$
declare definition text; marker text := '-- Optional framing is display metadata; photo ownership is still checked above.';
begin
  definition := pg_get_functiondef('public.taxua_diary_gateway(text,uuid,uuid,jsonb)'::regprocedure);
  if position(marker in definition) = 0 or position('if item ? ''size''' in definition) > 0 then
    raise exception 'Unexpected diary gateway; review photo-size validation before applying';
  end if;
  definition := replace(definition, marker, $validation$
        if item ? 'size' then
          if jsonb_typeof(item->'size') is distinct from 'string'
            or item->>'size' not in ('small','medium','large') then raise exception 'INVALID_PHOTO'; end if;
        end if;
        -- Optional framing is display metadata; photo ownership is still checked above.
$validation$);
  execute definition;
end
$migration$;

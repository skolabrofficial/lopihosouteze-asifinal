-- Allow organizers to delete articles
CREATE POLICY "Organizers can delete articles"
ON public.articles
FOR DELETE
USING (has_role(auth.uid(), 'organizer') OR has_role(auth.uid(), 'helper'));
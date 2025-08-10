-- Row Level Security 정책 설정

-- folders 테이블을 위한 RLS 정책
-- 1. 사용자는 자신의 폴더만 조회 가능
CREATE POLICY "Users can view own folders" ON "public"."folders"
AS PERMISSIVE FOR SELECT
TO public
USING (auth.uid() = user_id);

-- 2. 사용자는 자신의 폴더를 생성 가능
CREATE POLICY "Users can insert own folders" ON "public"."folders"
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK (auth.uid() = user_id);

-- 3. 사용자는 자신의 폴더를 수정 가능
CREATE POLICY "Users can update own folders" ON "public"."folders"
AS PERMISSIVE FOR UPDATE
TO public
USING (auth.uid() = user_id);

-- 4. 사용자는 자신의 폴더를 삭제 가능
CREATE POLICY "Users can delete own folders" ON "public"."folders"
AS PERMISSIVE FOR DELETE
TO public
USING (auth.uid() = user_id);

-- flashcard_files 테이블을 위한 RLS 정책
-- 1. 사용자는 자신의 flashcard_files만 조회 가능
CREATE POLICY "Users can view own flashcard_files" ON "public"."flashcard_files"
AS PERMISSIVE FOR SELECT
TO public
USING (auth.uid() = user_id);

-- 2. 사용자는 자신의 flashcard_files를 생성 가능
CREATE POLICY "Users can insert own flashcard_files" ON "public"."flashcard_files"
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK (auth.uid() = user_id);

-- 3. 사용자는 자신의 flashcard_files를 수정 가능
CREATE POLICY "Users can update own flashcard_files" ON "public"."flashcard_files"
AS PERMISSIVE FOR UPDATE
TO public
USING (auth.uid() = user_id);

-- 4. 사용자는 자신의 flashcard_files를 삭제 가능
CREATE POLICY "Users can delete own flashcard_files" ON "public"."flashcard_files"
AS PERMISSIVE FOR DELETE
TO public
USING (auth.uid() = user_id);

-- flashcards 테이블을 위한 RLS 정책
-- flashcards는 file_id를 통해 간접적으로 user와 연결됨
-- 1. 사용자는 자신의 flashcards만 조회 가능
CREATE POLICY "Users can view own flashcards" ON "public"."flashcards"
AS PERMISSIVE FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM flashcard_files 
    WHERE flashcard_files.id = flashcards.file_id 
    AND flashcard_files.user_id = auth.uid()
  )
);

-- 2. 사용자는 자신의 flashcards를 생성 가능
CREATE POLICY "Users can insert own flashcards" ON "public"."flashcards"
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM flashcard_files 
    WHERE flashcard_files.id = flashcards.file_id 
    AND flashcard_files.user_id = auth.uid()
  )
);

-- 3. 사용자는 자신의 flashcards를 수정 가능
CREATE POLICY "Users can update own flashcards" ON "public"."flashcards"
AS PERMISSIVE FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM flashcard_files 
    WHERE flashcard_files.id = flashcards.file_id 
    AND flashcard_files.user_id = auth.uid()
  )
);

-- 4. 사용자는 자신의 flashcards를 삭제 가능
CREATE POLICY "Users can delete own flashcards" ON "public"."flashcards"
AS PERMISSIVE FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1 FROM flashcard_files 
    WHERE flashcard_files.id = flashcards.file_id 
    AND flashcard_files.user_id = auth.uid()
  )
);

-- RLS 활성화 확인 (이미 활성화되어 있을 수도 있음)
ALTER TABLE "public"."folders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."flashcard_files" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."flashcards" ENABLE ROW LEVEL SECURITY;
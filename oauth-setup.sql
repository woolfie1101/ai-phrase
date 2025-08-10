-- OAuth 사용자를 위한 자동 프로필 생성 함수
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY definer SET search_path = public
AS $$
BEGIN
  -- public.users 테이블에 사용자 정보 삽입
  INSERT INTO public.users (id, email, name)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(
      new.raw_user_meta_data->>'name', 
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(
      new.raw_user_meta_data->>'name', 
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1)
    ),
    updated_at = timezone('utc'::text, now());
  
  -- user_profiles 테이블에 프로필 정보 삽입
  INSERT INTO public.user_profiles (user_id, display_name, avatar_url)
  VALUES (
    new.id, 
    COALESCE(
      new.raw_user_meta_data->>'name', 
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = COALESCE(
      new.raw_user_meta_data->>'name', 
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1)
    ),
    avatar_url = new.raw_user_meta_data->>'avatar_url',
    updated_at = timezone('utc'::text, now());
  
  RETURN new;
END;
$$;

-- 기존 트리거가 있다면 삭제
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 새 사용자 생성 시 자동으로 프로필 생성하는 트리거
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 사용자 정보 업데이트 시에도 프로필 동기화
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
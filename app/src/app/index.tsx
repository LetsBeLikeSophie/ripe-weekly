// 첫 진입: 리포트 설정이 있으면 리포트 탭으로, 없으면 시작 화면으로
import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { supabase } from "../lib/supabase";
import { listTopics } from "../lib/api";

export default function Index() {
  const [to, setTo] = useState<"/welcome" | "/home" | null>(null);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return setTo("/welcome");
      try { setTo((await listTopics()).length ? "/home" : "/welcome"); } catch { setTo("/welcome"); }
    })();
  }, []);
  return to ? <Redirect href={to} /> : null;
}

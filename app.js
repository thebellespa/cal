// 이미지 → base64 변환
function imgToBase64(img, callback) {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  callback(canvas.toDataURL('image/jpeg'));
}

// 파일 → base64 변환
function fileToBase64(file, callback) {
  const reader = new FileReader();
  reader.onload = () => callback(reader.result);
  reader.readAsDataURL(file);
}

// Gemini API 호출
async function fetchCalorieInfo(base64img) {
  const prompt = `이 이미지는 어떤 음식이고, 예상 칼로리는 몇 kcal인지 알려줘.\n- 음식명\n- 예상 칼로리(kcal)\n- 어떤 계산과정을 거쳤는지 bullet 형태로\n- 이 칼로리를 태우기 위한 운동량(예: 달리기, 등산 등)\n- 답변은 JSON 형식으로: {food: 음식명, calorie: 숫자, detail: [계산과정 bullet], exercise: "운동량"}`;
  const body = {
    contents: [{
      parts: [
        { text: prompt },
        { inlineData: { mimeType: "image/jpeg", data: base64img.split(',')[1] } }
      ]
    }],
    generationConfig: { temperature: 0.2, topK: 1, topP: 1 }
  };
  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + GEMINI_API_KEY,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }
  );
  const data = await res.json();
  try {
    const text = data.candidates[0].content.parts[0].text;
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)[0]);
    return json;
  } catch (e) {
    return { food: '알 수 없음', calorie: '-', detail: ['분석 실패'], exercise: '-' };
  }
}

// 운동량 이모티콘 매칭
function getExerciseEmoji(text) {
  if (!text) return '';
  let emoji = '';
  if (/달리기|run/i.test(text)) emoji = '🏃';
  else if (/걷기|walk/i.test(text)) emoji = '🚶';
  else if (/등산|hiking|mountain/i.test(text)) emoji = '🥾';
  else if (/자전거|cycle|bike/i.test(text)) emoji = '🚴';
  else if (/수영|swim/i.test(text)) emoji = '🏊';
  else if (/줄넘기|jump/i.test(text)) emoji = '🤸';
  else if (/요가|yoga/i.test(text)) emoji = '🧘';
  else if (/스쿼트|squat/i.test(text)) emoji = '🏋️';
  else if (/계단|stair/i.test(text)) emoji = '🪜';
  else emoji = '💪';
  return emoji + ' ' + text;
}

// 결과 표시
function showResult({ food, calorie, detail, exercise, img }) {
  document.getElementById('foodName').textContent = food;
  document.getElementById('calorie').textContent = calorie + ' kcal';
  const ul = document.getElementById('calculationDetail');
  ul.innerHTML = '';
  (detail || []).forEach(b => {
    const li = document.createElement('li');
    li.textContent = b;
    ul.appendChild(li);
  });
  document.getElementById('exercise').textContent = '운동량: ' + getExerciseEmoji(exercise);
  document.getElementById('result').style.display = 'block';
  const resultImg = document.getElementById('resultImg');
  if (img) {
    resultImg.src = img;
    resultImg.style.display = 'block';
  } else {
    resultImg.style.display = 'none';
  }
}

// 복사 기능
function copyResult() {
  const food = document.getElementById('foodName').textContent;
  const cal = document.getElementById('calorie').textContent;
  const detail = Array.from(document.querySelectorAll('#calculationDetail li')).map(li => '- ' + li.textContent).join('\n');
  const ex = document.getElementById('exercise').textContent;
  const text = `${food}\n${cal}\n${detail}\n${ex}`;
  navigator.clipboard.writeText(text);
  document.getElementById('copyBtn').textContent = '복사됨!';
  setTimeout(() => { document.getElementById('copyBtn').textContent = '결과 복사'; }, 1200);
}

document.querySelectorAll('.main-sample-img, .sample-img').forEach(img => {
  img.addEventListener('click', () => {
    imgToBase64(img, async (base64) => {
      document.getElementById('result').style.display = 'none';
      showResult({ food: '분석 중...', calorie: '', detail: [], exercise: '', img: base64 });
      const result = await fetchCalorieInfo(base64);
      showResult({ ...result, img: base64 });
    });
  });
});

document.getElementById('fileInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  fileToBase64(file, async (base64) => {
    document.getElementById('result').style.display = 'none';
    showResult({ food: '분석 중...', calorie: '', detail: [], exercise: '', img: base64 });
    const result = await fetchCalorieInfo(base64);
    showResult({ ...result, img: base64 });
  });
});

document.getElementById('copyBtn').addEventListener('click', copyResult); 
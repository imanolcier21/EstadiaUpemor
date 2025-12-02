import requests
import json
import re
from django.conf import settings

def consulta_huggingface(prompt, history, api_key, model):
    url = f'https://api-inference.huggingface.co/models/{model}'
    headers = {"Authorization": f"Bearer {api_key}"}
    data = {"inputs": prompt}
    try:
        r = requests.post(url, headers=headers, json=data, timeout=13)
        if r.status_code == 200:
            result = r.json()
            # Algunos modelos regresan un array, otros un string
            if isinstance(result, list) and len(result) > 0:
                respuesta = result[0].get('generated_text', '')
            elif isinstance(result, dict) and 'generated_text' in result:
                respuesta = result['generated_text']
            elif isinstance(result, dict) and 'error' in result:
                respuesta = '[HF ERROR]: ' + str(result['error'])
            else:
                respuesta = str(result)
            return respuesta.strip()
        else:
            print('[HF ERROR]', r.status_code, r.text)
            return 'No fue posible responder (modelo ocupado/fin de cuota).'
    except Exception as e:
        print('[HF EXCEP]:', e)
        return 'No fue posible responder (error de conexión).'

def consulta_openai(prompt, history, api_key, model="gpt-3.5-turbo"):
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    # Formatea la historia según el API de OpenAI
    chat_history = []
    for m in (history or []):
        # history: [{'rol': 'user'/'bot', 'text': ...}]
        role = "assistant" if m.get("rol", "") == "bot" else "user"
        chat_history.append({"role": role, "content": m.get("text", "")})
    chat_history.append({"role": "user", "content": prompt})
    data = {
        "model": model,
        "messages": chat_history,
        "max_tokens": 250,
        "temperature": 0.8
    }
    try:
        r = requests.post(url, headers=headers, json=data, timeout=15)
        if r.status_code == 200:
            result = r.json()
            respuesta = result['choices'][0]['message']['content']
            return respuesta.strip()
        else:
            print("[OpenAI ERROR]", r.status_code, r.text)
            return "No fue posible responder (OpenAI error)."
    except Exception as e:
        print("[OpenAI EXCEP]:", e)
        return "No fue posible responder (error de conexión)."

def analiza_texto_con_gemini(texto, api_key):
    prompt = (
        "Eres un detector emocional experto. Analiza el siguiente texto. Responde SOLO y ESTRICTAMENTE en formato JSON en una sola línea (sin explicación, sin saltos de línea, sin comentarios, sin preámbulo antes ni después), con las llaves: label, score, suicidio. Donde 'label' es la emoción/categoría detectada (ej. suicidio, depresión, ansiedad, tristeza, etc.), 'score' es un número entre -1 y 1 representando la gravedad, y 'suicidio' es true/false si hay riesgo."
        "Ejemplo de salida: {\"label\":\"suicidio\",\"score\":-0.99,\"suicidio\":true}. Texto: " + texto
    )
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key={api_key}"
    messages = [{"role": "user", "parts": [{"text": prompt}]}]
    data = {"contents": messages}
    try:
        r = requests.post(url, json=data, timeout=12)
        if r.status_code == 200 and 'candidates' in r.json():
            response = r.json()['candidates'][0]['content']['parts'][0]['text']
            print("[Gemini DEBUG] RESPUESTA RAW:", repr(response))
            # Extrae el primer {...} JSON válido
            matches = re.findall(r'\{.*?\}', response.replace('\n',' ').replace('\r',' '))
            for m in matches:
                try:
                    res = json.loads(m)
                    label = res.get('label','')
                    score = float(res.get('score',0))
                    suicidio = res.get('suicidio',False)
                    return score, label, bool(suicidio)
                except Exception:
                    continue
            print("[Gemini DEBUG] ERROR DE PARSEO JSON!", response)
        else:
            print("[Gemini DEBUG] STATUS O JSON INESPERADO:", r.status_code, r.text)
        return 0.0, 'desconocido', False
    except Exception as ex:
        print("[Gemini DEBUG] EXCEPTION:", ex)
        return 0.0, 'error', False

def consulta_gemini(prompt, history, api_key):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key={api_key}"
    messages = [{"role": "user", "parts": [{"text": prompt}]}]
    data = {"contents": messages}
    try:
        r = requests.post(url, json=data, timeout=12)
        if r.status_code == 200:
            res = r.json()
            # Se espera que la respuesta esté en res['candidates'][0]['content']['parts'][0]['text']
            if (
                'candidates' in res
                and res['candidates']
                and 'content' in res['candidates'][0]
                and 'parts' in res['candidates'][0]['content']
                and res['candidates'][0]['content']['parts']
                and 'text' in res['candidates'][0]['content']['parts'][0]
                ):
                return res['candidates'][0]['content']['parts'][0]['text']
            else:
                return '[Error IA]: Respuesta inesperada de Gemini.'
        else:
            # Intenta mostrar el error amigable
            try:
                err = r.json()
                if ('error' in err) and (isinstance(err['error'], dict)):
                    msg = err['error'].get('message', str(err))
                    if err['error'].get('status','').upper() in ['UNAVAILABLE','RESOURCE_EXHAUSTED'] or 'overloaded' in msg.lower():
                        return 'El chatbot está temporalmente saturado. Intenta de nuevo más tarde.'
                    return f"[Error IA]: {msg}"
            except Exception:
                pass
            return f"[Error IA]: {r.text}"
    except Exception as exc:
        return f"[Error excep]: {exc}"

def analiza_texto_con_openai(texto, api_key, model="gpt-3.5-turbo"):
    prompt = (
        "Responde SOLO con 1 línea de JSON, sin explicaciones, con estos campos: label (etiqueta emocional: depresion, ansiedad, suicidio, neutro, etc.), score (número entre -1 y 1; negativo es más grave), y suicidio (true/false: solo true si detectas pensamiento suicida explícito). "
        "Ejemplo: {\"label\":\"ansiedad\",\"score\":-0.60,\"suicidio\":false}. "
        "Texto: " + texto
    )
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    data = {
        "model": model,
        "messages": [
            {"role": "system", "content": "Eres un experto en psicología emocional."},
            {"role": "user", "content": prompt}
        ],
        "max_tokens": 70,
        "temperature": 0.1
    }
    try:
        r = requests.post(url, headers=headers, json=data, timeout=20)
        if r.status_code == 200:
            result = r.json()
            texto_respuesta = result['choices'][0]['message']['content']
            # Busca el primer JSON dentro del texto
            matches = re.findall(r'\{.*?\}', texto_respuesta.replace('\n',' ').replace('\r',' '))
            for m in matches:
                try:
                    res = json.loads(m)
                    label = res.get('label','')
                    score = float(res.get('score',0))
                    suicidio = res.get('suicidio',False)
                    return score, label, bool(suicidio)
                except Exception:
                    continue
            print('[OpenAI SENTIMENT] NO PARSEABLE:', texto_respuesta)
        else:
            print('[OpenAI SENTIMENT ERROR]', r.status_code, r.text)
        return 0.0, 'desconocido', False
    except Exception as e:
        print('[OpenAI SENTIMENT EXCEP]', e)
        return 0.0, 'error', False

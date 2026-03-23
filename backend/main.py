"""
SolarZ Finance Backend - Com Google Calendar e Sheets
"""

import os
import json
import requests
from datetime import datetime, timedelta
from urllib.parse import urlencode
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
import httpx

# Carregar variáveis de ambiente
load_dotenv()

app = FastAPI(title="SolarZ Finance API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configurações - Use environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
SLACK_BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN", "")
SLACK_CHANNEL = os.getenv("SLACK_CHANNEL", "#financeiro")

# Google OAuth
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/oauth/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Scopes para Calendar, Sheets, Drive e Gmail
SCOPES = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/drive"
]

# Arquivo para salvar tokens
TOKEN_FILE = "google_tokens.json"

# Cliente Slack
slack_client = WebClient(token=SLACK_BOT_TOKEN) if SLACK_BOT_TOKEN else None

# Headers para Supabase
supabase_headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

# Carregar tokens salvos
def load_tokens():
    try:
        if os.path.exists(TOKEN_FILE):
            with open(TOKEN_FILE, 'r') as f:
                return json.load(f)
    except:
        pass
    return None

def save_tokens(tokens):
    with open(TOKEN_FILE, 'w') as f:
        json.dump(tokens, f)

# Verificar se tem tokens válidos
def get_google_tokens():
    tokens = load_tokens()
    if tokens and 'access_token' in tokens:
        return tokens
    return None

# Revogar acesso Google
def revoke_google_tokens():
    tokens = load_tokens()
    if tokens and 'refresh_token' in tokens:
        try:
            # Chamar API de revoke do Google
            requests.post(
                'https://oauth2.googleapis.com/revoke',
                params={'token': tokens['refresh_token']}
            )
        except:
            pass
    # Remover arquivo de tokens
    if os.path.exists(TOKEN_FILE):
        os.remove(TOKEN_FILE)

# ============ ROTAS ============

@app.get("/")
async def root():
    tokens = get_google_tokens()
    return {
        "message": "SolarZ Finance API",
        "version": "2.0.0",
        "slack": "configurado" if slack_client else "não configurado",
        "google": "conectado" if tokens else "não conectado",
        "oauth_url": get_oauth_url() if not tokens else None
    }

def get_oauth_url():
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "prompt": "consent"
    }
    return f"https://accounts.google.com/o/oauth2/auth?{urlencode(params)}"

@app.get("/google/authorize")
async def authorize():
    """Redireciona para OAuth do Google"""
    return RedirectResponse(url=get_oauth_url())

@app.get("/oauth/callback")
async def oauth_callback(code: str):
    """Callback do OAuth - troca código por tokens"""
    try:
        # Trocar código por tokens
        token_url = "https://oauth2.googleapis.com/token"
        data = {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": GOOGLE_REDIRECT_URI
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(token_url, data=data)
            tokens = response.json()

        if 'access_token' in tokens:
            save_tokens(tokens)
            return {"message": "Google conectado com sucesso!", "status": "ok"}
        else:
            return {"error": "Erro ao obter tokens", "details": tokens}
    except Exception as e:
        return {"error": str(e)}

@app.get("/google/status")
async def google_status():
    """Verifica status da conexão Google"""
    tokens = get_google_tokens()
    if tokens:
        return {"connected": True}
    return {"connected": False, "authorize_url": get_oauth_url()}

@app.post("/google/revoke")
async def google_revoke():
    """Revoga acesso Google"""
    revoke_google_tokens()
    return {"status": "ok", "message": "Acesso Google revogado"}

# ============ INVESTIMENTOS ============

@app.get("/investimentos")
async def listar_investimentos():
    try:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/investimentos",
            headers=supabase_headers,
            params={"select": "*", "order": "data_vencimento.asc"}
        )
        return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/resumo")
async def get_resumo():
    try:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/investimentos",
            headers=supabase_headers,
            params={"select": "*"}
        )
        investimentos = response.json()

        total_orcado = sum(i.get("valor_orcado", 0) or 0 for i in investimentos)
        total_realizado = sum(i.get("valor_realizado", 0) or 0 for i in investimentos)
        total_pago = sum(i.get("valor_realizado", 0) or 0 for i in investimentos if i.get("status") == "PAGO")

        por_status = {}
        for i in investimentos:
            status = i.get("status", "PENDENTE")
            por_status[status] = por_status.get(status, 0) + 1

        por_categoria = {}
        for i in investimentos:
            cat = i.get("tipo_fornecedor", "Outros")
            valor = i.get("valor_realizado", 0) or 0
            por_categoria[cat] = por_categoria.get(cat, 0) + valor

        return {
            "total_orcado": total_orcado,
            "total_realizado": total_realizado,
            "total_pago": total_pago,
            "pendente": total_orcado - total_pago,
            "por_status": por_status,
            "por_categoria": por_categoria,
            "total_investimentos": len(investimentos)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ SLACK ============

@app.post("/slack/test")
async def test_slack():
    if not slack_client:
        return {"status": "Slack não configurado"}
    try:
        response = slack_client.chat_postMessage(
            channel=SLACK_CHANNEL,
            text="✅ SolarZ Finance Bot conectado com sucesso!"
        )
        return {"status": "ok", "message": "Mensagem enviada!"}
    except SlackApiError as e:
        return {"status": "error", "detail": str(e)}

@app.post("/slack/notificar")
async def notificar_investimento(data: dict):
    if not slack_client:
        raise HTTPException(status_code=500, detail="Slack não configurado")

    investimento = data.get("investimento", {})

    emoji_status = {"PENDENTE": "⏳", "RECEBIDO": "📥", "APROVADO": "✅", "PAGO": "💚"}
    emoji = emoji_status.get(investimento.get("status", ""), "💰")

    mensagem = f"""
{emoji} *Novo Investimento Cadastrado*

*Fornecedor:* {investimento.get('nome_fornecedor', 'N/A')}
*Categoria:* {investimento.get('tipo_fornecedor', 'N/A')}
*Valor:* R$ {investimento.get('valor_realizado', 0):,.2f}
*Vencimento:* {investimento.get('data_vencimento', 'N/A')}
*Status:* {investimento.get('status', 'PENDENTE')}
*Responsável:* {investimento.get('responsavel', 'N/A')}
    """

    try:
        slack_client.chat_postMessage(channel=SLACK_CHANNEL, text=mensagem, mrkdwn=True)
        return {"status": "ok"}
    except SlackApiError as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ GOOGLE CALENDAR ============

@app.post("/calendar/criar-evento")
async def criar_evento_calendario(data: dict):
    """Cria um evento no Google Calendar"""
    tokens = get_google_tokens()
    if not tokens:
        return {"error": "Google não conectado", "authorize_url": get_oauth_url()}

    titulo = data.get("titulo", "Pagamento")
    descricao = data.get("descricao", "")
    data_evento = data.get("data")  # YYYY-MM-DD
    hora = data.get("hora", "09:00")

    if not data_evento:
        return {"error": "Data é obrigatória"}

    # Criar evento
    evento = {
        "summary": titulo,
        "description": descricao,
        "start": {
            "dateTime": f"{data_evento}T{hora}:00-03:00",
            "timeZone": "America/Sao_Paulo"
        },
        "end": {
            "dateTime": f"{data_evento}T{hora}:00-03:00",
            "timeZone": "America/Sao_Paulo"
        },
        "reminders": {
            "useDefault": False,
            "overrides": [
                {"method": "popup", "minutes": 60},
                {"method": "email", "minutes": 1440}
            ]
        }
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://www.googleapis.com/calendar/v3/calendars/primary/events",
                json=evento,
                headers={"Authorization": f"Bearer {tokens['access_token']}"}
            )
            if response.status_code == 200:
                return {"status": "ok", "evento": response.json()}
            else:
                return {"error": response.text}
    except Exception as e:
        return {"error": str(e)}

# ============ GOOGLE SHEETS ============

# Arquivo para salvar ID da planilha
SHEETS_FILE = "sheets_id.txt"

def load_sheets_id():
    try:
        if os.path.exists(SHEETS_FILE):
            with open(SHEETS_FILE, 'r') as f:
                return f.read().strip()
    except:
        pass
    return None

def save_sheets_id(sheets_id):
    with open(SHEETS_FILE, 'w') as f:
        f.write(sheets_id)

@app.post("/sheets/atualizar")
async def atualizar_planilha(request: Request):
    """Atualiza a planilha existente com os dados do Supabase"""
    tokens = get_google_tokens()
    if not tokens:
        return {"error": "Google não conectado", "authorize_url": get_oauth_url()}

    # Buscar investimentos do Supabase
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/investimentos",
        headers=supabase_headers,
        params={"select": "*", "order": "data_vencimento"}
    )
    investimentos = response.json()

    # Verificar se planilha já existe
    sheets_id = load_sheets_id()

    # Preparar dados para atualização
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    # Debug: verificar dados
    print(f"Total investimentos: {len(investimentos)}")
    if investimentos:
        print(f"Primeiro investimento: {investimentos[0]}")

    # Calcular totais
    total_orcado = sum(float(i.get("valor_orcado", 0)) for i in investimentos)
    total_realizado = sum(float(i.get("valor_realizado", 0)) for i in investimentos)

    # Limpar dados existentes e adicionar novos
    # Linha de totais
    values = [["", "", "", "", "TOTAL GERAL", f"R$ {total_orcado:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."), f"R$ {total_realizado:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."), "", "", "", "", "", "", "", "", "", ""]]

    # Cabecalhos em português formatado
    values.append(["Fornecedor", "Categoria", "Descrição", "Valor Orçado", "Valor Realizado", "Quantidade", "Forma Pagamento", "Parcelas", "Data Vencimento", "Datas Parcelas", "NF", "Possui Boleto", "Resp.", "Mês", "Status", "Observações"])

    for i in investimentos:
        # Converter código do mês para formato legível
        mes_ref = i.get("mes_referencia", "")
        if "_" in mes_ref:
            mes, ano = mes_ref.split("_")
            meses = {"FEV": "Fev", "MAR": "Mar", "ABR": "Abr", "MAI": "Mai", "JUN": "Jun",
                     "JUL": "Jul", "AGO": "Ago", "SET": "Set", "OUT": "Out", "NOV": "Nov", "DEZ": "Dez"}
            mes_ref = meses.get(mes, mes)

        # Converter status para formato legível
        status = i.get("status", "")
        status_labels = {"PENDENTE": "Pendente", "RECEBIDO": "Recebido", "APROVADO": "Aprovado", "PAGO": "Pago"}

        # Converter boleto/nf para texto legível
        possui_boleto = "Sim" if i.get("possui_boleto_nf") else "Não"

        # Formatar datas de parcelas se existirem
        datas_pagamento = i.get("datas_pagamento", [])
        datas_str = ""
        if datas_pagamento and isinstance(datas_pagamento, list):
            datas_str = ", ".join([str(d)[:10] for d in datas_pagamento if d])
        elif datas_pagamento and isinstance(datas_pagamento, str):
            datas_str = datas_pagamento

        # Formatar data de vencimento
        data_venc = i.get("data_vencimento", "")
        if data_venc and "T" in data_venc:
            data_venc = data_venc[:10]

        # Formatar valores
        val_orcado = float(i.get("valor_orcado", 0))
        val_realizado = float(i.get("valor_realizado", 0))

        values.append([
            i.get("nome_fornecedor", ""),
            i.get("tipo_fornecedor", ""),
            i.get("descricao_despesa", ""),
            val_orcado,
            val_realizado,
            i.get("quantidade", 1),
            i.get("forma_pagamento", ""),
            i.get("numero_parcelas", 1),
            data_venc,
            datas_str,
            i.get("numero_nota_fiscal", ""),
            possui_boleto,
            i.get("responsavel", ""),
            mes_ref,
            status_labels.get(status, status),
            i.get("observacoes", "")
        ])

    async with httpx.AsyncClient() as client:
        if sheets_id:
            # Atualizar planilha existente
            try:
                # Primeiro, limpar a planilha (range completo da aba correta)
                await client.post(
                    f"https://sheets.googleapis.com/v4/spreadsheets/{sheets_id}/values/{SHEET_ID}!A1:ZZ9999:clear",
                    headers=headers
                )
                # Depois, escrever os novos dados na aba correta
                response = await client.put(
                    f"https://sheets.googleapis.com/v4/spreadsheets/{sheets_id}/values/{SHEET_ID}!A1?valueInputOption=USER_ENTERED",
                    headers=headers,
                    json={"values": values}
                )

                # Aplicar formatação com cores Solarz
                if response.status_code == 200:
                    num_linhas = len(values)
                    num_colunas = len(values[0]) if values else 0

                    # Formatar cabeçalho com cores Solarz
                    format_request = {
                        "requests": [
                            {
                                "repeatCell": {
                                    "range": {
                                        "sheetId": int(SHEET_ID),
                                        "startRowIndex": 1,
                                        "endRowIndex": 2,
                                        "startColumnIndex": 0,
                                        "endColumnIndex": num_colunas
                                    },
                                    "cell": {
                                        "userFormatting": {
                                            "backgroundColor": {"red": 0, "green": 0.4, "blue": 0.8},  # #0066CC
                                            "textFormat": {
                                                "foregroundColor": {"red": 1, "green": 1, "blue": 1},
                                                "bold": True
                                            }
                                        }
                                    },
                                    "fields": "userFormatting"
                                }
                            },
                            {
                                "repeatCell": {
                                    "range": {
                                        "sheetId": int(SHEET_ID),
                                        "startRowIndex": 0,
                                        "endRowIndex": 1,
                                        "startColumnIndex": 0,
                                        "endColumnIndex": num_colunas
                                    },
                                    "cell": {
                                        "userFormatting": {
                                            "backgroundColor": {"red": 1, "green": 0.42, "blue": 0.21},  # #FF6B35
                                            "textFormat": {
                                                "foregroundColor": {"red": 1, "green": 1, "blue": 1},
                                                "bold": True,
                                                "fontSize": 12
                                            }
                                        }
                                    },
                                    "fields": "userFormatting"
                                }
                            },
                            {
                                "autoResizeDimensions": {
                                    "dimensions": {
                                        "sheetId": int(SHEET_ID),
                                        "dimension": "COLUMNS",
                                        "startIndex": 0,
                                        "endIndex": num_colunas
                                    }
                                }
                            }
                        ]
                    }

                    try:
                        await client.post(
                            f"https://sheets.googleapis.com/v4/spreadsheets/{sheets_id}:batchUpdate",
                            headers=headers,
                            json=format_request
                        )
                    except:
                        pass  # Se der erro na formatação, não critica

                    return {"status": "ok", "message": "Planilha atualizada!", "url": f"https://docs.google.com/spreadsheets/d/{sheets_id}"}
            except Exception as e:
                # Se der erro, pode ser que a planilha não exista mais
                sheets_id = None

        # Se não existe, criar nova planilha
        spreadsheet = {
            "properties": {"title": "SolarZ Finance - Investimentos"},
            "sheets": [{"properties": {"title": "Investimentos"}}]
        }

        response = await client.post(
            "https://sheets.googleapis.com/v4/spreadsheets",
            json=spreadsheet,
            headers=headers
        )

        if response.status_code == 200:
            result = response.json()
            sheets_id = result.get("spreadsheetId")
            save_sheets_id(sheets_id)

            # Escrever dados
            await client.put(
                f"https://sheets.googleapis.com/v4/spreadsheets/{sheets_id}/values/{SHEET_ID}!A1?valueInputOption=USER_ENTERED",
                headers=headers,
                json={"values": values}
            )

            return {"status": "ok", "message": "Nova planilha criada!", "spreadsheetId": sheets_id, "url": result.get("spreadsheetUrl")}
        else:
            return {"error": response.text}


@app.post("/sheets/criar-planilha")
async def criar_planilha(data: dict):
    """Cria uma nova planilha (força criação) - para usar a planilha atualizada, use /sheets/atualizar"""
    # Redirecionar para atualizar
    return await atualizar_planilha()

# ============ GOOGLE GMAIL (EMAIL) ============

@app.post("/email/enviar")
async def enviar_email(data: dict):
    """Envia email sobre pagamento"""
    tokens = get_google_tokens()
    if not tokens:
        return {"error": "Google não conectado", "authorize_url": get_oauth_url()}

    destinatario = data.get("destinatario", "")
    assunto = data.get("assunto", "Lembrete de Pagamento")
    corpo = data.get("corpo", "")

    if not destinatario:
        return {"error": "Destinatário é obrigatório"}

    import base64
    from email.mime.text import MIMEText

    message = MIMEText(corpo, "html")
    message["to"] = destinatario
    message["subject"] = assunto

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
                json={"raw": base64.urlsafe_b64encode(message.as_bytes()).decode()},
                headers={"Authorization": f"Bearer {tokens['access_token']}"}
            )
            if response.status_code == 200:
                return {"status": "ok", "messageId": response.json().get("id")}
            else:
                return {"error": response.text}
    except Exception as e:
        return {"error": str(e)}

# ============ GOOGLE DRIVE - CRIAÇÃO DE PASTAS ============

# Estrutura de pastas MKT
ESTRUTURA_MKT = {
    "MKT": {
        "PROJETOS": {
            "PROMOCIONAL": None,
            "INSTITUCIONAL": None,
            "CAPA": None
        },
        "EVENTOS": None  # será criado dinamicamente
    }
}

def formatar_nome_pasta(nome: str) -> str:
    """Formata nome para padrão de pasta"""
    return nome.strip().title()

@app.get("/drive/status")
async def drive_status():
    """Verifica conexão com Google Drive"""
    tokens = get_google_tokens()
    if not tokens:
        return {"connected": False, "authorize_url": get_oauth_url()}
    return {"connected": True}

@app.post("/drive/criar-evento")
async def criar_pasta_evento(data: dict):
    """Cria estrutura de pastas para um evento no Google Drive - Seguindo nomenclatura MKT"""
    try:
        pass
    except:
        return {"error": "JSON inválido"}

    tokens = get_google_tokens()
    if not tokens:
        return {"error": "Google não conectado", "authorize_url": get_oauth_url()}

    # Parâmetros
    nome_evento = data.get("nome_evento", "Imersão GALAX")  # Padrão
    mes = data.get("mes", "")  # Ex: "2. JULHO"
    edicao = data.get("edicao", "")  # Ex: "8ª EDIÇÃO"

    # ID fixo da pasta base (pasta da edição específica)
    PASTA_BASE_ID = "1hdT3TSn4FjlyrUg75LNoYG1GsrLiXpPV"

    async with httpx.AsyncClient() as client:
        headers = {"Authorization": f"Bearer {tokens['access_token']}"}

        pastas_criadas = []

        # Usar a pasta base fornecida (pasta da edição específica)
        pasta_base = {"id": PASTA_BASE_ID}

        # Criar FINANCEIRO dentro da pasta base
        pasta_financeiro = await buscar_pasta_por_nome(client, headers, "FINANCEIRO", pasta_base["id"])
        if not pasta_financeiro or 'id' not in pasta_financeiro:
            pasta_financeiro = await criar_pasta(client, headers, "FINANCEIRO", pasta_base["id"])

        if pasta_financeiro and 'id' in pasta_financeiro:
            pastas_criadas.append({"nome": "FINANCEIRO", "id": pasta_financeiro["id"], "tipo": "Financeiro"})
        else:
            return {"error": "Não foi possível criar pasta FINANCEIRO", "debug": pasta_financeiro}

        # Criar PLANILHAS dentro de FINANCEIRO
        pasta_planilhas = await buscar_pasta_por_nome(client, headers, "PLANILHAS", pasta_financeiro["id"])
        if not pasta_planilhas or 'id' not in pasta_planilhas:
            pasta_planilhas = await criar_pasta(client, headers, "PLANILHAS", pasta_financeiro["id"])

        if pasta_planilhas and 'id' in pasta_planilhas:
            pastas_criadas.append({"nome": "PLANILHAS", "id": pasta_planilhas["id"], "tipo": "Planilhas"})
        else:
            return {"error": "Não foi possível criar pasta PLANILHAS", "debug": pasta_planilhas}

        pasta_final_id = pasta_planilhas["id"]

        # Link direto para pasta de planilhas
        link_planilhas = f"https://drive.google.com/drive/folders/{pasta_planilhas['id']}"

        return {
            "status": "ok",
            "evento": nome_evento,
            "mes": mes,
            "edicao": edicao,
            "pasta_financeiro": f"https://drive.google.com/drive/folders/{pasta_financeiro['id']}",
            "pasta_planilhas": link_planilhas,
            "pastas": pastas_criadas
        }


@app.post("/drive/criar-planilha-evento")
async def criar_planilha_evento(data: dict):
    """Cria uma planilha dentro da pasta de FINANCEIRO/PLANILHAS do evento"""
    tokens = get_google_tokens()
    if not tokens:
        return {"error": "Google não conectado", "authorize_url": get_oauth_url()}

    # Parâmetros
    nome_evento = data.get("nome_evento", "Imersão GALAX")
    mes = data.get("mes", "")  # Ex: "2. JULHO"
    edicao = data.get("edicao", "")  # Ex: "8ª EDIÇÃO"
    nome_planilha = data.get("nome_planilha", "INVESTIMENTOS")

    async with httpx.AsyncClient() as client:
        headers = {"Authorization": f"Bearer {tokens['access_token']}"}

        # Usar a pasta base diretamente
        pasta_base = {"id": PASTA_BASE_ID}

        pasta_evento = await buscar_pasta_por_nome(client, headers, nome_evento, pasta_eventos["id"])
        if not pasta_evento:
            return {"error": f"Pasta do evento '{nome_evento}' não encontrada"}

        # Buscar até a pasta PLANILHAS
        pasta_pai = pasta_evento
        if mes:
            pasta_mes = await buscar_pasta_por_nome(client, headers, mes, pasta_evento["id"])
            if pasta_mes:
                pasta_pai = pasta_mes
                if edicao:
                    pasta_edicao = await buscar_pasta_por_nome(client, headers, edicao, pasta_mes["id"])
                    if pasta_edicao:
                        pasta_pai = pasta_edicao

        # Buscar FINANCEIRO > PLANILHAS
        pasta_financeiro = await buscar_pasta_por_nome(client, headers, "FINANCEIRO", pasta_pai["id"])
        if not pasta_financeiro:
            return {"error": "Pasta FINANCEIRO não encontrada"}

        pasta_planilhas = await buscar_pasta_por_nome(client, headers, "PLANILHAS", pasta_financeiro["id"])
        if not pasta_planilhas:
            return {"error": "Pasta PLANILHAS não encontrada"}

        # Gerar nome segundo padrão: PLANILHAS [Nome_Mes_Edicao] NomePlanilha
        nome_formatado = f"PLANILHAS [{nome_evento}_{mes}_{edicao}] {nome_planilha}"

        # Criar planilha
        spreadsheet = {
            "properties": {"title": nome_formatado},
            "parents": [pasta_planilhas["id"]]
        }

        try:
            async with httpx.AsyncClient() as hc:
                response = await hc.post(
                    "https://sheets.googleapis.com/v4/spreadsheets",
                    json=spreadsheet,
                    headers={"Authorization": f"Bearer {tokens['access_token']}"}
                )
                if response.status_code == 200:
                    result = response.json()
                    return {
                        "status": "ok",
                        "nome": nome_formatado,
                        "spreadsheetId": result.get("spreadsheetId"),
                        "url": result.get("spreadsheetUrl")
                    }
                else:
                    return {"error": response.text}
        except Exception as e:
            return {"error": str(e)}

async def buscar_pasta_por_nome(client, headers, nome, pai_id=None):
    """Busca pasta por nome"""
    query = f"name='{nome}' and mimeType='application/vnd.google-apps.folder'"
    if pai_id:
        query += f" and '{pai_id}' in parents"
    else:
        query += " and 'root' in parents"

    try:
        response = await client.get(
            "https://www.googleapis.com/drive/v3/files",
            headers=headers,
            params={"q": query, "fields": "files(id,name)"}
        )
        if response.status_code == 200:
            data = response.json()
            if data.get("files"):
                return data["files"][0]
    except Exception as e:
        print(f"Erro ao buscar pasta: {e} - Response: {response.text if response else 'No response'}")
    return None

async def criar_pasta(client, headers, nome, pai_id):
    """Cria uma pasta"""
    pasta = {
        "name": nome,
        "mimeType": "application/vnd.google-apps.folder"
    }
    if pai_id:
        pasta["parents"] = [pai_id]

    response = await client.post(
        "https://www.googleapis.com/drive/v3/files",
        headers=headers,
        json=pasta,
        params={"fields": "id,name"}
    )
    return response.json()

@app.get("/drive/listar-eventos")
async def listar_eventos():
    """Lista pastas de eventos existentes"""
    tokens = get_google_tokens()
    if not tokens:
        return {"error": "Google não conectado"}

    async with httpx.AsyncClient() as client:
        headers = {"Authorization": f"Bearer {tokens['access_token']}"}

        # Buscar pasta MKT
        pasta_mkt = await buscar_pasta_por_nome(client, headers, "MKT")
        if not pasta_mkt:
            return {"eventos": []}

        # Buscar pasta EVENTOS
        pasta_eventos = await buscar_pasta_por_nome(client, headers, "EVENTOS", pasta_mkt["id"])
        if not pasta_eventos:
            return {"eventos": []}

        # Listar eventos
        response = await client.get(
            "https://www.googleapis.com/drive/v3/files",
            headers=headers,
            params={
                "q": f"'{pasta_eventos['id']}' in parents and mimeType='application/vnd.google-apps.folder'",
                "fields": "files(id,name)"
            }
        )

        if response.status_code == 200:
            eventos = response.json().get("files", [])
            return {"eventos": eventos}

        return {"eventos": []}

# ID da pasta de BOLETOS no Drive (fornecido pelo usuário)
PASTA_BOLETOS_ID = "1jgGeKq512GqaCsvlj_IvZ8YZxjOWIS61"

# ID da planilha do Sheets (gid da URL)
SHEET_ID = "2083282215"

@app.post("/drive/upload-boleto")
async def upload_boleto(request: Request):
    """Faz upload de arquivo de boleto/NF para o Google Drive"""
    tokens = get_google_tokens()
    if not tokens:
        return {"error": "Google não conectado", "authorize_url": get_oauth_url()}

    # Parse multipart form data
    try:
        form = await request.form()
        arquivo = form.get("file")
        investimento_id = form.get("investimento_id")

        if not arquivo:
            return {"error": "Nenhum arquivo enviado"}

        # Ler o conteúdo do arquivo
        conteudo = await arquivo.read()
        nome_original = arquivo.filename or "boleto.pdf"

        # Buscar informações do investimento no Supabase
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/investimentos?id=eq.{investimento_id}",
            headers=supabase_headers
        )
        investimentos = response.json()

        if investimentos:
            inv = investimentos[0]
            # Criar nome do arquivo: EV_GAL_Fornecedor_Data_NF.ext
            fornecedor = inv.get("nome_fornecedor", "fornecedor").replace(" ", "_")
            data_venc = inv.get("data_vencimento", "").replace("-", "")
            nf = inv.get("numero_nota_fiscal", "sem_nf").replace(" ", "_")
            extensao = nome_original.split(".")[-1] if "." in nome_original else "pdf"
            nome_arquivo = f"EV_GAL_{fornecedor}_{data_venc}_{nf}.{extensao}"
        else:
            nome_arquivo = nome_original

        # Fazer upload para o Drive
        async with httpx.AsyncClient() as client:
            headers_upload = {
                "Authorization": f"Bearer {tokens['access_token']}",
                "Content-Type": "application/octet-stream"
            }

            # Criar arquivo no Drive
            metadata = {
                "name": nome_arquivo,
                "parents": [PASTA_BOLETOS_ID]
            }

            # Upload simples
            response = await client.post(
                "https://www.googleapis.com/upload/drive/v3/files",
                headers=headers_upload,
                params={"uploadType": "multipart"},
                files={"file": (nome_arquivo, conteudo, "application/octet-stream")},
                data=metadata
            )

            if response.status_code in [200, 201]:
                result = response.json()
                file_id = result.get("id")

                # Tornar público para visualização
                await client.post(
                    f"https://www.googleapis.com/drive/v3/files/{file_id}/permissions",
                    headers={"Authorization": f"Bearer {tokens['access_token']}"},
                    json={"type": "anyone", "role": "reader"}
                )

                # Obter link de visualização
                file_response = await client.get(
                    f"https://www.googleapis.com/drive/v3/files/{file_id}",
                    headers={"Authorization": f"Bearer {tokens['access_token']}"},
                    params={"fields": "webViewLink,webContentLink"}
                )

                if file_response.status_code == 200:
                    file_data = file_response.json()
                    return {
                        "status": "ok",
                        "message": "Arquivo enviado com sucesso!",
                        "fileId": file_id,
                        "webViewLink": file_data.get("webViewLink"),
                        "webContentLink": file_data.get("webContentLink")
                    }
            else:
                return {"error": f"Erro ao enviar: {response.text}"}

    except Exception as e:
        return {"error": str(e)}

# ============ GESTÃO DE USUÁRIOS ============

# Lista de usuários cadastrados
@app.get("/users/list")
async def list_users():
    """Lista todos os usuários ativos"""
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/user_profiles?ativo=eq.true&select=*",
        headers=supabase_headers
    )
    if response.status_code == 200:
        return {"users": response.json()}
    return {"error": response.text}

# Criar convite
@app.post("/users/invite")
async def create_invite(request: Request):
    """Cria um convite para novo usuário"""
    try:
        data = await request.json()
    except:
        return {"error": "JSON inválido"}

    email = data.get("email", "").strip().lower()
    nome = data.get("nome", "").strip()
    role = data.get("role", "usuario")

    if not email or not nome:
        return {"error": "Email e nome são obrigatórios"}

    # Gerar token único
    import uuid
    token = str(uuid.uuid4())

    # Verificar se email já existe
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/user_profiles?email=eq.{email}",
        headers=supabase_headers
    )
    if response.status_code == 200 and response.json():
        return {"error": "Email já cadastrado"}

    # Criar convite
    invite_data = {
        "email": email,
        "nome": nome,
        "role": role,
        "token": token,
        "expires_at": (datetime.now() + timedelta(days=7)).isoformat()
    }

    response = requests.post(
        f"{SUPABASE_URL}/rest/v1/user_invites",
        headers=supabase_headers,
        json=invite_data
    )

    if response.status_code in [200, 201]:
        # Gerar link de convite
        invite_link = f"{FRONTEND_URL}/convite?token={token}"

        # Enviar email com convite
        email_data = {
            "to": email,
            "subject": f"Convite para SolarZ Finance - {nome}",
            "html": f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #0066CC, #0052A3); padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0;">SolarZ Finance</h1>
                    <p style="color: white; margin: 5px 0 0 0;">Controle de Investimentos - SolarZ Marketing</p>
                </div>
                <div style="padding: 30px; background: #f5f5f5;">
                    <h2 style="color: #333;">Olá, {nome}!</h2>
                    <p style="color: #666;">Você foi convidado para participar da plataforma <strong>SolarZ Finance</strong>.</p>
                    <p style="color: #666;"><strong>Seu perfil:</strong> {role}</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{invite_link}" style="background: #0066CC; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">ACESSE AQUI</a>
                    </div>
                    <p style="color: #999; font-size: 12px;">Este link expira em 7 dias.</p>
                </div>
            </div>
            """
        }

        # Tentar enviar email (se configurado)
        try:
            email_res = requests.post(
                f"http://localhost:8000/email/enviar",
                json=email_data,
                timeout=5
            )
        except:
            pass

        return {
            "status": "ok",
            "message": "Convite criado!",
            "invite_link": invite_link,
            "email": email
        }
    return {"error": response.text}

# Validar convite
@app.get("/users/validate-invite")
async def validate_invite(token: str):
    """Valida um token de convite"""
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/user_invites?token=eq.{token}&status=eq.pendente&expires_at=gt.{datetime.now().isoformat()}",
        headers=supabase_headers
    )

    if response.status_code == 200:
        invites = response.json()
        if invites:
            return {"valid": True, "invite": invites[0]}
    return {"valid": False}

# Aceitar convite e criar usuário
@app.post("/users/accept-invite")
async def accept_invite(request: Request):
    """Aceita convite e cria usuário"""
    try:
        data = await request.json()
    except:
        return {"error": "JSON inválido"}

    token = data.get("token", "")
    password = data.get("password", "")

    if not token or not password:
        return {"error": "Token e senha são obrigatórios"}

    # Validar convite
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/user_invites?token=eq.{token}&status=eq.pendente",
        headers=supabase_headers
    )

    if response.status_code != 200:
        return {"error": "Erro ao validar convite"}

    invites = response.json()
    if not invites:
        return {"error": "Convite inválido ou expirado"}

    invite = invites[0]

    # Criar usuário no Supabase Auth
    try:
        auth_response = requests.post(
            f"{SUPABASE_URL}/auth/v1/signup",
            headers={"apikey": SUPABASE_KEY, "Content-Type": "application/json"},
            json={
                "email": invite["email"],
                "password": password,
                "data": {
                    "name": invite["nome"],
                    "role": invite["role"]
                }
            }
        )

        if auth_response.status_code not in [200, 201]:
            # Usuário pode já existir, tentar sign in
            if "already been registered" in auth_response.text:
                return {"error": "Este email já está cadastrado. Faça login normalmente."}
            return {"error": f"Erro ao criar usuário: {auth_response.text}"}

        user_data = auth_response.json()
        user_id = user_data.get("user", {}).get("id")

        if user_id:
            # Criar perfil
            profile_data = {
                "user_id": user_id,
                "email": invite["email"],
                "nome": invite["nome"],
                "role": invite["role"],
                "ativo": True
            }

            requests.post(
                f"{SUPABASE_URL}/rest/v1/user_profiles",
                headers=supabase_headers,
                json=profile_data
            )

            # Atualizar status do convite
            requests.patch(
                f"{SUPABASE_URL}/rest/v1/user_invites?token=eq.{token}",
                headers=supabase_headers,
                json={"status": "aceito"}
            )

            return {"status": "ok", "message": "Usuário criado com sucesso!"}

    except Exception as e:
        return {"error": str(e)}

    return {"error": "Falha ao processar convite"}

# Atualizar usuário
@app.patch("/users/update")
async def update_user(request: Request):
    """Atualiza dados de um usuário"""
    try:
        data = await request.json()
    except:
        return {"error": "JSON inválido"}

    user_id = data.get("user_id")
    updates = data.get("updates", {})

    if not user_id:
        return {"error": "ID do usuário é obrigatório"}

    response = requests.patch(
        f"{SUPABASE_URL}/rest/v1/user_profiles?user_id=eq.{user_id}",
        headers=supabase_headers,
        json=updates
    )

    if response.status_code in [200, 201]:
        return {"status": "ok", "message": "Usuário atualizado!"}
    return {"error": response.text}

# Desativar usuário
@app.post("/users/deactivate")
async def deactivate_user(request: Request):
    """Desativa um usuário"""
    try:
        data = await request.json()
    except:
        return {"error": "JSON inválido"}

    user_id = data.get("user_id")

    if not user_id:
        return {"error": "ID do usuário é obrigatório"}

    response = requests.patch(
        f"{SUPABASE_URL}/rest/v1/user_profiles?user_id=eq.{user_id}",
        headers=supabase_headers,
        json={"ativo": False}
    )

    if response.status_code in [200, 201]:
        return {"status": "ok", "message": "Usuário desativado!"}
    return {"error": response.text}

# Get user permissions by role
@app.get("/users/permissions")
async def get_permissions():
    """Retorna permissões por role"""
    return {
        "roles": {
            "admin": {
                "name": "Administrador",
                "description": "Acesso completo ao sistema",
                "permissions": [
                    "gerenciar_usuarios",
                    "criar_investimentos",
                    "editar_investimentos",
                    "excluir_investimentos",
                    "exportar_planilhas",
                    "gerenciar_cadastros",
                    "upload_boletos",
                    "ver_relatorios"
                ]
            },
            "gestor": {
                "name": "Gestor",
                "description": "Gestão de equipe e investimentos",
                "permissions": [
                    "criar_investimentos",
                    "editar_investimentos",
                    "exportar_planilhas",
                    "gerenciar_cadastros",
                    "upload_boletos",
                    "ver_relatorios"
                ]
            },
            "financeiro": {
                "name": "Financeiro",
                "description": "Acesso ao financeiro",
                "permissions": [
                    "criar_investimentos",
                    "editar_investimentos",
                    "exportar_planilhas",
                    "upload_boletos",
                    "ver_relatorios"
                ]
            },
            "usuario": {
                "name": "Usuário",
                "description": "Acesso básico",
                "permissions": [
                    "criar_investimentos",
                    "ver_relatorios"
                ]
            }
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

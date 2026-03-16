
import json
from collections import defaultdict

def analyze_turmas(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Estrutura: unidades[unidade_nome][atividade_nome] = [vagas_por_turma]
    unidades = defaultdict(lambda: defaultdict(list))
    
    # Iterar sobre as chaves do JSON (rondon, roosevelt, etc)
    for key in data:
        # Normalizar o nome da unidade pela chave do JSON também
        unidade_padrao = key.upper()
        
        for turma in data[key]:
            # Verificar se está ativo (só por segurança, embora pareçam todos 'S')
            if turma.get('idAtivo') != 'S':
                continue

            # Tentar pegar unidade e atividade pelo dsTurma
            parts = turma['dsTurma'].split('|')
            if len(parts) >= 2:
                unidade_nome = parts[0].strip().upper()
                atividade_nome = parts[1].strip().upper()
                vagas = turma.get('qtVagas', 0)
                
                # Usamos a unidade do dsTurma se ela existir, senão a da chave
                target_unidade = unidade_nome if unidade_nome else unidade_padrao
                unidades[target_unidade][atividade_nome].append(vagas)
            else:
                # Caso o dsTurma não siga o padrão |, usamos a chave e o próprio dsTurma como atividade
                vagas = turma.get('qtVagas', 0)
                unidades[unidade_padrao][turma['dsTurma'].upper()].append(vagas)
    
    total_turmas_geral = 0
    atividades_unicas = set()
    total_combinacoes_unidade_atividade = 0

    # Imprimir resultado estruturado
    for unidade in sorted(unidades.keys()):
        print(f"\n🏢 Unidade: {unidade}")
        print("-" * 50)
        
        atividades = unidades[unidade]
        total_combinacoes_unidade_atividade += len(atividades)
        
        for atividade in sorted(atividades.keys()):
            atividades_unicas.add(atividade)
            vagas_list = atividades[atividade]
            total_turmas = len(vagas_list)
            total_turmas_geral += total_turmas
            vagas_str = ", ".join(map(str, vagas_list))
            print(f"  ✨ {atividade}:")
            print(f"     - Turmas: {total_turmas}")
            print(f"     - Vagas p/ Turma: [{vagas_str}]")

    print("\n" + "="*50)
    print("📊 RESUMO GERAL")
    print("="*50)
    print(f"Total de Turmas (Classes): {total_turmas_geral}")
    print(f"Total de Tipos de Atividades (Unicos): {len(atividades_unicas)}")
    print(f"Total de Oficinas (Unidade + Atividade): {total_combinacoes_unidade_atividade}")
    print("="*50)

if __name__ == "__main__":
    analyze_turmas(r'c:\Users\Klisman rDs\Documents\RT-Checklist\turmas.json')

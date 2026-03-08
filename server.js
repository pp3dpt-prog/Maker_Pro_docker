const express = require('express');
const { exec } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors({
    origin: 'https://maker-pro-frontend.vercel.app', 
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
})); // Permite que o teu frontend fale com o backend
app.use(express.json());

// Configuração do Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 1. GARANTIR QUE A PASTA TEMP EXISTE (Evita erro de ficheiro não encontrado)
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}

app.post('/gerar-stl-pro', async (req, res) => {
    const { nome, telefone, forma } = req.body;
    
    // Validação básica
    if (!nome || !telefone || !forma) {
        return res.status(400).json({ error: "Faltam dados (nome, telefone ou forma)" });
    }

    const id = `pro_${Date.now()}`;
    const scadPath = path.join(tempDir, `${id}.scad`);
    const stlPath = path.join(tempDir, `${id}.stl`);

    const nomeLimpo = nome.replace(/[^a-z0-9 ]/gi, '');
    const telLimpo = telefone.replace(/[^0-9+ ]/g, '');

    // LÓGICA DE GEOMETRIA (Relevo na frente + Escavação no verso)
    const scadCode = `
    $fn=60;
    altura_base = 3; 
    
    // Importa o template da pasta templates
    include <templates/blank_${forma.toLowerCase()}.scad>;

    union() {
        // PARTE 1: Base e Nome em RELEVO (Frente)
        union() {
            ${forma.toLowerCase()}_base(); 
            
            // Texto do Nome (sobe 3mm para ficar no topo da base)
            translate([0, 0, altura_base]) 
            linear_extrude(height=1) 
            text("${nomeLimpo}", size=4, halign="center", valign="center", font="sans:style=Bold");
        }
        
        // PARTE 2: Telefone ESCAVADO (Verso)
        // Subtraímos isto da união acima
        difference() {
            // Placeholder para manter a estrutura correta se necessário
            cube([0,0,0]); 
            
            rotate([0, 180, 0])
            translate([0, 0, 0.5]) // Entra 0.5mm para dentro da peça
            linear_extrude(height=1) 
            text("${telLimpo}", size=3, halign="center", valign="center", font="sans");
        }
    }
    `;

    try {
        // Escreve o ficheiro .scad temporário
        fs.writeFileSync(scadPath, scadCode);

        // Comando OpenSCAD com Manifold para rapidez
        const comando = `openscad --enable=manifold -o "${stlPath}" "${scadPath}"`;
        //const comando = `openscad -o "${stlPath}" "${scadPath}"`;
        exec(comando, async (error, stdout, stderr) => {
            if (error) {
                console.error("Erro OpenSCAD completo:", stderr);
                return res.status(500).json({ error: "Erro na renderização do modelo" });
            }

            try {
                // 2. UPLOAD PARA O SUPABASE COM TRATAMENTO DE ERRO
                const fileBuffer = fs.readFileSync(stlPath);
                const { error: uploadError } = await supabase.storage
                    .from('makers_pro_stls')
                    .upload(`previews/${id}.stl`, fileBuffer);

                if (uploadError) throw uploadError;

                // 3. OBTER URL PÚBLICO
                const { data } = supabase.storage
                    .from('makers_pro_stls')
                    .getPublicUrl(`previews/${id}.stl`);

                res.json({ url: data.publicUrl });

            } catch (upErr) {
                console.error("Erro Storage:", upErr);
                res.status(500).json({ error: "Erro ao carregar ficheiro para a nuvem" });
            } finally {
                // 4. LIMPEZA DOS FICHEIROS TEMPORÁRIOS
                if (fs.existsSync(scadPath)) fs.unlinkSync(scadPath);
                if (fs.existsSync(stlPath)) fs.unlinkSync(stlPath);
            }
        });
    } catch (err) {
        console.error("Erro Interno:", err);
        res.status(500).send("Erro interno ao processar pedido");
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor a correr na porta ${PORT}`));
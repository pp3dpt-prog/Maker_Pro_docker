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
    const numCaracteres = nomeLimpo.length;

    // LÓGICA DE GEOMETRIA (Relevo na frente + Escavação no verso)
    const formaLimpa = forma.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace("ç", "c");
    const fontSize = Math.max(2.5, Math.min(5, 20 / numCaracteres));
    const scadCode = `
    // Inclui os teus templates (garante que o nome do módulo lá dentro coincide)
    include <templates/blank_${formaLimpa}.scad>;

    difference() {
        // 1. O QUE QUEREMOS MANTER (A Peça + Nome em relevo)
        union() {
            // Chamas o módulo que está dentro do teu ficheiro .scad (ex: blank_coracao.scad)
            blank_${formaLimpa}(); 
            
            // Nome na Frente (Z = 3)
            translate([0, 3, altura]) 
            linear_extrude(height=1.2) 
            text("${nomeLimpo}", size=${fontSize}, halign="center", valign="center", font="Liberation Sans:style=Bold");
        }
        
        // 2. O QUE QUEREMOS RETIRAR (O número no verso)
        // Usamos um Z ligeiramente negativo (-0.5) para garantir que fura a face de baixo
        translate([0, 3, -0.5]) 
        linear_extrude(height=1.5) 
        mirror([1, 0, 0]) // Espelha para que se leia corretamente ao virar a peça
        text("${telLimpo}", size=3.5, halign="center", valign="center", font="Liberation Sans:style=Bold");
    }
    `;

    try {
        // Escreve o ficheiro .scad temporário
        fs.writeFileSync(scadPath, scadCode);

        // Comando OpenSCAD com Manifold para rapidez
        //const comando = `openscad --enable=manifold -o "${stlPath}" "${scadPath}"`;
        const comando = `openscad -o "${stlPath}" "${scadPath}"`;
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
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
}));
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}

app.post('/gerar-stl-pro', async (req, res) => {
    const { nome, telefone, forma } = req.body;
    
    if (!nome || !telefone || !forma) {
        return res.status(400).json({ error: "Faltam dados" });
    }

    const id = `pro_${Date.now()}`;
    const scadPath = path.join(tempDir, `${id}.scad`);
    const stlPath = path.join(tempDir, `${id}.stl`);

    const nomeLimpo = nome.replace(/[^a-z0-9 ]/gi, '').trim();
    const telLimpo = telefone.replace(/[^0-9+ ]/g, '').trim();
    const formaLimpa = forma.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace("ç", "c");
    const fontSize = Math.max(2.5, Math.min(5, 20 / Math.max(1, nomeLimpo.length)));

    // LÓGICA DE GEOMETRIA CORRIGIDA
    const scadCode = `
        // Importa o STL base (garante que a pasta templates existe no Docker)
        union() {
            import("templates/blank_${formaLimpa}.stl");
            
            // Texto na Frente
            translate([0, 3, 3]) // Ajusta o Z conforme a espessura da tua base
            linear_extrude(height=1.2) 
            text("${nomeLimpo}", size=${fontSize}, halign="center", valign="center", font="Liberation Sans:style=Bold");
        }
        
        // Texto no Verso (Corte)
        translate([0, 0, -0.5]) 
        linear_extrude(height=1) 
        text("${telLimpo}", size=4, halign="center", valign="center", font="Liberation Sans:style=Bold");
    `;

    try {
        fs.writeFileSync(scadPath, scadCode);

        // A FLAG DE VELOCIDADE ESTÁ AQUI: --enable=manifold
        const comando = `openscad --enable=manifold -o "${stlPath}" "${scadPath}"`;
        
        exec(comando, async (error, stdout, stderr) => {
            if (error) {
                console.error("ERRO DETALHADO OPENSCAD:", stderr); // Isto vai mostrar o erro real no log
                return res.status(500).json({ error: "Erro na renderização: " + stderr });
            }
            // ... resto do código

            try {
                const fileBuffer = fs.readFileSync(stlPath);
                const { error: uploadError } = await supabase.storage
                    .from('makers_pro_stls')
                    .upload(`previews/${id}.stl`, fileBuffer);

                if (uploadError) throw uploadError;

                const { data } = supabase.storage
                    .from('makers_pro_stls')
                    .getPublicUrl(`previews/${id}.stl`);

                res.json({ url: data.publicUrl });

            } catch (upErr) {
                console.error("Erro Storage:", upErr);
                res.status(500).json({ error: "Erro no upload" });
            } finally {
                if (fs.existsSync(scadPath)) fs.unlinkSync(scadPath);
                if (fs.existsSync(stlPath)) fs.unlinkSync(stlPath);
            }
        });
    } catch (err) {
        console.error("Erro Interno:", err);
        res.status(500).send("Erro interno");
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor na porta ${PORT}`));
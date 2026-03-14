const express = require('express');
const { exec } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
// Substitui o teu app.use(cors(...)) atual por isto:
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "https://maker-pro-frontend.vercel.app");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Credentials", "true");
    
    // Resposta imediata para o pedido OPTIONS (pre-flight)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});
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
    const fontSize = Math.max(3, Math.min(5, 35 / Math.max(1, nomeLimpo.length)));
    
    // Ajusta tamanhos para o coração (forma menor)
    const fontSizeNome = formaLimpa === "coracao" ? fontSize * 0.4 : fontSize;
    const fontSizeNumero = formaLimpa === "coracao" ? 2.2 : 4;

    // LÓGICA DE GEOMETRIA CORRIGIDA
    const scadCode = `
difference() {
    // O QUE FICA (Base + Nome em Relevo na Frente)
    union() {
        import("../templates/blank_${formaLimpa}.stl"); 
        
        // Nome na Frente: Em relevo (extrusado)
        translate([0, 0, 2.9]) 
        linear_extrude(height=1) 
        text("${nomeLimpo}", size=${fontSizeNome}, halign="center", valign="center", font="Liberation Sans:style=Bold");
    }
    
    // O QUE CORTA (Número no Verso - Escavado no lado oposto)
    translate([0, 0, -1.5]) mirror([1, 0, 0])
    linear_extrude(height=2.5) 
    text("${telLimpo}", size=${fontSizeNumero}, halign="center", valign="center", font="Liberation Sans:style=Bold");
}
`;

    try {
        fs.writeFileSync(scadPath, scadCode);

        // REMOVIDO o --enable=manifold que causa o erro
        const comando = `openscad -o "${stlPath}" "${scadPath}"`;
        
        exec(comando, async (error, stdout, stderr) => {
            if (error) {
                console.error("ERRO OPENSCAD:", stderr); // Importante para debug
                return res.status(500).json({ error: "Erro na renderização: " + stderr });
            }

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
// Variáveis injetadas pelo backend
// nome = "REX";
// telefone = "912345678";

// Importa a base escolhida
include <templates/blank_coracao.scad>; 

union() {
    // 1. Manter a base original com o nome em relevo
    difference() {
        coracao_base_cubo(); // Forma base
        
        // Opcional: se quiseres o nome escavado, usa 'difference'. 
        // Se queres em relevo (extrusado para fora), usa 'union'.
    }
    
    // NOME EM RELEVO (Extrusado 1mm para fora)
    translate([0, 0, 3]) // Assume altura=3 da peça base
    linear_extrude(height=1) 
    text(nome, size=4, halign="center", valign="center", font="Liberation Sans:style=Bold");
}

// 2. NÚMERO ESCAVADO NO VERSO (Subtração)
translate([0, 0, -0.5]) // Profundidade de 0.5mm a 1mm no verso
rotate([0, 180, 0])
linear_extrude(height=1) 
text(telefone, size=3, halign="center", valign="center");
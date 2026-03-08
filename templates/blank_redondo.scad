$fn = 100;
altura = 3;

union() {
    cylinder(h=altura, r=18); // Círculo
    
    // Argola
    translate([0, 20, 0]) 
    difference() {
        cylinder(h=altura, r=6);
        translate([0, 0, -1]) cylinder(h=altura+2, r=3);
    }
}
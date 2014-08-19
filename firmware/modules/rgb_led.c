#include "rgb_led.h"
#include "i2c_bb.h"

void sendColor(unsigned char red, unsigned char green, unsigned char blue)
{
    // Start by sending a byte with the format "1 1 /B7 /B6 /G7 /G6 /R7 /R6"
    unsigned char prefix = 0b11000000;
    if ((blue & 0x80) == 0)     prefix|= 0b00100000;
    if ((blue & 0x40) == 0)     prefix|= 0b00010000; 
    if ((green & 0x80) == 0)    prefix|= 0b00001000;
    if ((green & 0x40) == 0)    prefix|= 0b00000100;
    if ((red & 0x80) == 0)      prefix|= 0b00000010;
    if ((red & 0x40) == 0)      prefix|= 0b00000001;
    I2C_Write(prefix);
        
    // Now must send the 3 colors
    I2C_Write(blue);
    I2C_Write(green);
    I2C_Write(red);
}



void setColorRGB(unsigned char red, unsigned char green, unsigned char blue)
{
    // Send data frame prefix (32x "0")
    I2C_Write(0x00);
    I2C_Write(0x00);
    I2C_Write(0x00);
    I2C_Write(0x00);
    
     
	sendColor(red, green, blue);

    // Terminate data frame (32x "0")
    I2C_Write(0x00);
    I2C_Write(0x00);
    I2C_Write(0x00);
    I2C_Write(0x00);
}
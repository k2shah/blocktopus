#ifndef OUTPUT_H
#define OUTPUT_H

void init_output(void);
void output_main_loop(void);
void output_usb_input_handler(unsigned char * midiMsg, unsigned char len);

#endif

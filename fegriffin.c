/* -------------- fegrifdev: for Grifc + attached digitisers ------------- */
/*    fegrifdev.c: midas frontend interface (init,start/stopRun,readEvent) */
/* odb_settings.c: functions to read and apply odb electronics settings    */

#include <stdio.h>
#include <netinet/in.h> /* sockaddr_in, IPPROTO_TCP, INADDR_ANY */
#include <netdb.h>      /* gethostbyname */
#include <stdlib.h>     /* exit() */
#include <string.h>     /* memset() */
#include <errno.h>      /* errno */
#include <unistd.h>     /* usleep */
#include <time.h>       /* select */
#include "midas.h"
#include "experim.h"
#include "tig4g.h"
#include "grifc.h"

#define STRING_LEN 256 // typical length for temporary strings
#define WORD_LEN    32 // typical length for short tmp strings
#define MAX_EVT_SIZE 500000 // was originally 500000
#define MSG_BUF_SIZE  10000 // for single packet messages

// TARGET_EVENT_SIZE is the size of each MIDAS event in bytes ie 100 fragements ~5000 bytes
// TARGET_EVENT_SIZE should be smaller than MAX_EVT_SIZE
// Set TARGET_EVENT_SIZE to zero to get one fragment per midas event (each set of midas headers)
#define TARGET_EVENT_SIZE 10000 // will return at least 1 per second even if not this size

char fename[STRING_LEN]="fegrifdev";

/////////////////////////  Midas Variables ////////////////////////////////////
char *frontend_name = fename;                        /* fe MIDAS client name */
char *frontend_file_name = __FILE__;               /* The frontend file name */
BOOL frontend_call_loop = FALSE;   /* frontend_loop called periodically TRUE */
int display_period = 0;          /* status page displayed with this freq[ms] */
int max_event_size = MAX_EVT_SIZE;     /* max event size produced by this frontend */
int max_event_size_frag = 5 * 1024 * 1024;       /*max for fragmented events */
int event_buffer_size = 4 * 800000;            /* buffer size to hold events */
extern HNDLE hDB; // Odb Handle

int frontend_init();                  int frontend_exit();
int begin_of_run(int run, char *err); int end_of_run(int run, char *err);
int pause_run(int run, char *err);    int resume_run(int run, char *err);
int frontend_loop(){ return SUCCESS; }
int read_trigger_event(char *pevent, INT off);
int read_scalar_event(char *pevent, INT off);

BANK_LIST trigger_bank_list[] = { /* online banks */
   {"GRF2", TID_DWORD, 16, NULL},
   {""},
};
EQUIPMENT equipment[] = {
   {"Trigger",                                             /* equipment name */
      {1, 0, "SYSTEM",                      /* event ID, trigger mask, Evbuf */
       EQ_POLLED, 0, "MIDAS",         /* equipment type, EventSource, format */
       TRUE, RO_RUNNING,                              /* enabled?, WhenRead? */
       50, 0, 0, 0,                 /* poll[ms], Evt Lim, SubEvtLim, LogHist */
       "", "", "",}, read_trigger_event,                  /* readout routine */
    /*NULL, NULL, trigger_bank_list*/                           /* bank list */
   },
   {"Scalar",                                              /* equipment name */
    {2, 0, "SYSTEM",                        /* event ID, trigger mask, Evbuf */

     EQ_PERIODIC, 0,                          /* equipment type, EventSource */
     "MIDAS", TRUE, RO_RUNNING | RO_ODB,      /* format, enabled?, WhenRead? */
     1000, 0, 0, 0,                 /* poll[ms], Evt Lim, SubEvtLim, LogHist */
     "", "", "",}, read_scalar_event,                     /* readout routine */
   },

   {""}
};
////////////////////////////////////////////////////////////////////////////

HNDLE hSet;
TRIGGER_SETTINGS ts;

#define DEFAULT_MASTER "grifip09" // master
//#define SERVER_HOSTNAME "grifip07" // slave
//#define SERVER_HOSTNAME "grifip13" // grif16d
//#define SERVER_HOSTNAME "grifip12" // grif16c
//#define SERVER_HOSTNAME "grifip11" // grif16b
//#define SERVER_HOSTNAME "grifip10" // grif16
//#define SERVER_HOSTNAME "grsmid00" // test

static int master_grifc, slave_grifc;

#define DATA_PORT 8800
#define CMD_PORT  8808

#define WRITE 1 // parameter encoding
#define READ  0

static int debug_data;
static int addr_len = sizeof(struct sockaddr);
static struct sockaddr_in cmd_addr, data_addr;
static int data_socket, cmd_socket;
static char msgbuf[STRING_LEN];
static char replybuf[MAX_EVT_SIZE]; // max_event_size
static int replybufbytes;
static float EPICS_Rates[40]; // Values from scalars and sent to ODB
static float last_Rates[11];

void param_encode(char *buf, int par, int write, int chan, int val);
int  param_decode(unsigned char *buf, int *par, int *chan, int *val);
int  open_udp_socket(char *host, int port, struct sockaddr_in *addr);
int  open_tcp_socket(char *host, int port, struct sockaddr_in *addr);
int  sndmsg(int fd, struct sockaddr_in *addr, char *msg, int len, char *reply);
int  testmsg(int socket, int timeout);
int  readmsg(int socket);
void grifc_eventread_init();
int  grifc_eventread(int data_socket, int addr, int *pdest, int *nentry, int *pkt_num);
int  write_settings(HNDLE, HNDLE);
int dump_data_buffers(int);

void seq_callback(INT hDB, INT hseq, void *info)
{ printf("odb ... trigger settings touched\n"); }

int interrupt_configure(INT cmd, INT source, PTYPE adr){ return SUCCESS; }
int pause_run(INT run_number, char *error){ return SUCCESS; }
int resume_run(INT run_number, char *error){ return SUCCESS; }
int frontend_exit(){ return SUCCESS; }
int frontend_init()
{
   char tmp_str[STRING_LEN], **argv;
   int i, status, size, argc;

   // to allow fe name to change, frontend_init() has been moved in mfe.c
   // and is now called before the frontend connects to the odb
   // i.e. calling any odb functions in frontend_init() will now fail

   //TRIGGER_SETTINGS_STR(trigger_settings_str); // Map odb Trigger/settings
   //sprintf(tmp_str, "/Equipment/Trigger/Settings");
   //status = db_create_record(hDB, 0, tmp_str, strcomb(trigger_settings_str));
   //status = db_find_key (hDB, 0, tmp_str, &hSet);
   //if( status != DB_SUCCESS ) cm_msg(MINFO,"FE","Key %s not found", tmp_str);
   //size = sizeof(TRIGGER_SETTINGS); // Enable hot-link on trigger/settings
   //if( (status = db_open_record(hDB, hSet, &ts, size, MODE_READ, seq_callback,
   //                              NULL)) != DB_SUCCESS){ return status; }

   mfe_get_args(&argc, &argv); // grab program arguments
   strcpy(tmp_str, DEFAULT_MASTER);
   for(i=0; i<argc; i++){
      if( (argv[i])[0] == '-' && (argv[i])[1] == 'i' && i+1<argc){
	 if( (size = strlen(argv[i+1])) >= STRING_LEN ){ size = STRING_LEN-1; }
	 strncpy(tmp_str, argv[1+i++], size); tmp_str[size]=0;
         sprintf(fename, "fe%s", tmp_str);
         continue;
      }
      //if( (argv[i])[0] == '-' && (argv[i])[1] == 'm' ){ master_grifc=1; }
      //if( (argv[i])[0] == '-' && (argv[i])[1] == 's' ){ slave_grifc =1; }
   }
   if(      strcmp(tmp_str, "grifip09") == 0 ){ master_grifc=1; }
   else if( strcmp(tmp_str, "grifip07") == 0 ||
            strcmp(tmp_str, "grifip08") == 0 ){ slave_grifc =1; }
   else if( strcmp(tmp_str, "grifip10") == 0 ||
            strcmp(tmp_str, "grifip11") == 0 ||
            strcmp(tmp_str, "grifip12") == 0 ||
            strcmp(tmp_str, "grifip13") == 0 ||
            strcmp(tmp_str, "grifip14") == 0 ){ /*grif16*/; }
   else {
      printf("unrecognised data source: %s\n", tmp_str );
      return(FE_ERR_HW); // could attempt to carry on here ...
   }
   if( master_grifc ){
      printf("Module is Master Grifc [3-level system]\n");
   } else if( slave_grifc ){
      printf("Module is Slave Grifc [2-level system]\n");
   } else {
      printf("Module is Digitizer [1-level system]\n");
   }
   printf("griffin init ... connecting to %s\n", tmp_str );
   if( (data_socket = open_udp_socket(tmp_str, DATA_PORT,&data_addr)) < 0 ){ ; }
   if( (cmd_socket  = open_udp_socket(tmp_str, CMD_PORT, &cmd_addr )) < 0 ){ ; }
        
   printf("Writing parameters ...\n");
   if( master_grifc ){
      printf("   Setting Master Grifc ...\n");
      param_encode(msgbuf, GRIFC_CSR, WRITE, GRIFC_MSTPAR, CSR_SETMASTER | CSR_ENABLE_FILTER | CSR_PPG_EVENTS);
      status = sndmsg(cmd_socket, &cmd_addr, msgbuf, 12, replybuf);
      printf("reply:%d bytes\n", status);

      // Following added by Adam 2015 July 06
      // Program the VME address of the PPG and the PPG idle pattern
      param_encode(msgbuf, PPG_VMEADDR, WRITE, GRIFC_PPGPAR, DEFAULT_VMEADDR);
      status = sndmsg(cmd_socket, &cmd_addr, msgbuf, 12, replybuf);
      printf("reply:%d bytes\n",status);
      param_encode(msgbuf, PPG_IDLEPAT, WRITE, GRIFC_PPGPAR, 0x0);
      status = sndmsg(cmd_socket, &cmd_addr, msgbuf, 12, replybuf);
      printf("reply:%d bytes\n", status);

      // Network packet size for GRIF-C Master
      param_encode(msgbuf, GRIFC_NETSIZE, WRITE, GRIFC_MSTPAR, 7000);
      status = sndmsg(cmd_socket, &cmd_addr, msgbuf, 12, replybuf);
      printf("reply:%d bytes\n", status);
   }
   printf("done\n");
   return SUCCESS;
}

// initial test ...
//   p,a, r,m,   2,0, 0,0,   83,3, 0,0    len=12
//   data sent to chan starts with rm, ends with 83,3
//   memcpy(msgbuf, "PARM", 4);
//   *(unsigned short *)(&msgbuf[4]) =   2; // parnum = 2       [0x0002]
//   *(unsigned short *)(&msgbuf[6]) =   0; // op=write, chan=0 [0x0000]
//   *(unsigned int   *)(&msgbuf[8]) = 899; // value = 899 [0x0000 0383]
void param_encode(char *buf, int par, int write, int chan, int val)
{
   memcpy(buf, "PARM", 4);
   msgbuf [4] = (par & 0x3f00)     >>  8; msgbuf[ 5] = (par & 0xff);
   msgbuf[ 6] = (chan& 0xff00)     >>  8; msgbuf[ 7] = (chan& 0xff);
   msgbuf[ 8] = (val & 0xff000000) >> 24; msgbuf[ 9] = (val & 0xff0000) >> 16;
   msgbuf[10] = (val & 0xff00    ) >>  8; msgbuf[11] = (val & 0xff);
   if( ! write ){ msgbuf[4] |= 0x40; }
}

int param_decode(unsigned char *buf, int *par, int *chan, int *val)
{
   if( strncmp((char *)buf, "RDBK", 4) != 0 ){ return(-1); } // wrong header
   if( ! (buf[4] & 0x40) ){ return(-1); } // readbit not set
   *par  = ((buf[4] & 0x3f ) << 8) | buf[5];
   *chan = ((buf[6] & 0xff ) << 8) | buf[7];
   *val  = (buf[8]<<24) | (buf[9]<<16) | (buf[10]<<8) | buf[11];
   return(0);
}

#define GRIF16_PORT   80
#define GRIF16_NUM 5
static struct sockaddr_in grif16_addr[GRIF16_NUM];
static int   grif16_fd[GRIF16_NUM]={-1,-1,-1,-1,-1};
static char *grif16_name[GRIF16_NUM] = {
   "grifadc01", "grifadc02", "grifadc03", "grifadc04", "grifadc05"
};

int begin_of_run(int run_number, char *error)
{
   int i, status, size;

   size = sizeof(TRIGGER_SETTINGS); /* read Triggger settings again ? */
   if ((status = db_get_record (hDB, hSet, &ts, &size, 0)) != DB_SUCCESS){
      return status;
   }
   printf("Writing parameters ...\n");
   write_settings(hDB, hSet);

   fprintf(stdout,"connecting to grif16s ...");
   for(i=0; i<GRIF16_NUM; i++){
      grif16_fd[i]=open_tcp_socket(grif16_name[i],GRIF16_PORT,&grif16_addr[i]);
      fprintf(stdout," %s ", grif16_name[i] );
   }
   fprintf(stdout,"done\n");

   printf("Starting ACQ ...\n");
   printf("requesting data ...\n");
   if( sndmsg(data_socket, &data_addr, "DRQ ", 4, NULL) < 0 ){
      printf("   datarequest failed\n");
   }
   if( testmsg(cmd_socket,10000) > 0 ){
      printf("reply:%d bytes\n", readmsg(cmd_socket) );
   } else {
      printf("reply:No Reply to DataStart Rcvd!\n");
   }
   //grifc_eventread_init();
   dump_data_buffers(data_socket);
   // set run-bit csr[8] - par 63 on chan255 or 3840 to 256
   // [master also needs bit9 set]
   if( master_grifc ){
      param_encode(msgbuf, GRIFC_SSCSR, WRITE, GRIFC_MSTPAR, CSR_RUN);
   } else if( slave_grifc ){
      param_encode(msgbuf, GRIFC_SSCSR, WRITE, GRIFC_SLAVEPAR, CSR_RUN);
   } else {
      param_encode(msgbuf, GRIFC_SSCSR, WRITE, GRIF16_PAR, CSR_RUN);
   }
   i = sndmsg(cmd_socket, &cmd_addr, msgbuf, 12, replybuf); // 96/144 bits
   printf("reply:%d bytes\n", i); 
   printf("End of BOR\n");
   return SUCCESS;
}

int end_of_run(int run_number, char *error)
{
   int i;
   // clr run-bit csr[8] - par 63 on chan 255 to 0
   // [master needs bit9 to remain set]
   if( master_grifc ){
      param_encode(msgbuf, GRIFC_SCCSR, WRITE, GRIFC_MSTPAR, CSR_RUN);
   } else if( slave_grifc ){
      param_encode(msgbuf, GRIFC_SCCSR, WRITE, GRIFC_SLAVEPAR, CSR_RUN);
   } else {
      param_encode(msgbuf, GRIFC_SCCSR, WRITE, GRIF16_PAR, CSR_RUN);
   }
   i = sndmsg(cmd_socket, &cmd_addr, msgbuf, 12, replybuf); // 96/144 bits
   printf("reply:%d bytes\n", i); 

   dump_data_buffers(data_socket);

   for(i=0; i<GRIF16_NUM; i++){
     if( grif16_fd[i] != -1 ){ close(grif16_fd[i]); grif16_fd[i] = -1; }
   }

   if( sndmsg(data_socket, &data_addr, "STOP", 4, NULL) < 0 ){
      printf("   datastop failed\n");
   }
   if( testmsg(cmd_socket,10000) > 0 ){
      printf("reply:%d bytes\n", readmsg(cmd_socket) );
   } else {
      printf("reply:No Reply to DataStop Rcvd!\n");
   }
   return SUCCESS;
}

#define MIN_EVT_SIZE 6 /* 32bit words */
/* test/count mode is used to determine poll timing */
static int data_available;
INT poll_event(INT source, INT count, BOOL test)
{
   int i, have_data=0;

   for(i=0; i<count; i++){
      if( data_available ){ break; }
      have_data = ( testmsg(data_socket, 0) > 0 );
      if( have_data && !test ){ break; }
   }
   return( (have_data || data_available) && !test );
}

void printreply(int bytes)
{
   int i; printf("  ");
   for(i=0; i<bytes; i++){
      printf("%02x", replybuf[i]);  if( !((i+1)%2) ){ printf(" "); }
   } printf("::");
   for(i=0; i<bytes; i++){
      printf( (replybuf[i]>20 && replybuf[i]<127) ? "%c" : ".", replybuf[i]);
   } printf("\n");
}

// param format ...
//    parm [32bit] x50,41,52,4D
//       1bit used in firmware + 15bit parnum 
//       16bit addr: 4bit ctrl, 4bitgrifc, 4bit port, 4bit chan
//       32bit val
#define STRING_LEN 256
#define NUM_PATTERN 10
int write_settings(HNDLE hDB, HNDLE hSet) // odb, trigset
{
   int i, status, size, ppg_codes[NUM_PATTERN]; int ppg_durations[NUM_PATTERN];
   char tmp[STRING_LEN], cycle_name[STRING_LEN];
   HNDLE hSubkey, hKey, hCycle;
   KEY key;

   if( master_grifc ){
      // Following added by Adam 2015 July 06
      // Program the VME address of the PPG and the PPG idle pattern
      param_encode(msgbuf, PPG_VMEADDR, WRITE, GRIFC_PPGPAR, DEFAULT_VMEADDR);
      status = sndmsg(cmd_socket, &cmd_addr, msgbuf, 12, replybuf);
      printf("reply:%d bytes\n",status);
      param_encode(msgbuf, PPG_IDLEPAT, WRITE, GRIFC_PPGPAR, 0x0);
      status = sndmsg(cmd_socket, &cmd_addr, msgbuf, 12, replybuf);
      printf("reply:%d bytes\n", status);

      // Network packet size for GRIF-C Master
      param_encode(msgbuf, GRIFC_NETSIZE, WRITE, GRIFC_MSTPAR, 7000);
      status = sndmsg(cmd_socket, &cmd_addr, msgbuf, 12, replybuf);
   }

   memset(ppg_codes,0,sizeof(int)*NUM_PATTERN);
   memset(ppg_durations,0,sizeof(int)*NUM_PATTERN);

   sprintf(tmp,"/PPG/Current");
   if( (status=db_find_key(hDB, 0, tmp, &hSubkey)) != DB_SUCCESS){
     cm_msg(MINFO,"FE","Key %s not found", tmp); return(-1);
   }
   size=sizeof(cycle_name);
   if( (db_get_data(hDB,hSubkey,cycle_name,&size,TID_STRING)) != DB_SUCCESS){
      cm_msg(MINFO,"FE","Can't get data for Key %s", tmp); return(-1);
   }
   sprintf(tmp,"/PPG/Cycles");
   if( (status=db_find_key(hDB, 0, tmp, &hKey)) != DB_SUCCESS){
      cm_msg(MINFO,"FE","Key %s not found", tmp); return(-1);
   }
   hCycle=0;
   for(i=0;;i++){
      if( db_enum_key (hDB, hKey, i, &hSubkey) != DB_SUCCESS ){ break; }
      db_get_key(hDB, hSubkey, &key);
      if( key.type != TID_KEY ){
         fprintf(stdout,"Ignored [%16s] in /PPG/Cycles\n", key.name );
         continue;
      }
      size = strlen(cycle_name);
      if( size < strlen(key.name) ){ size = strlen(key.name); }
      if( size > STRING_LEN ){ size = STRING_LEN; } 
      if( strncmp(cycle_name, key.name, size) != 0 ){ continue; }
      hCycle=hSubkey; break;
   }
   if( hCycle == 0 ){
      cm_msg(MINFO,"FE","Key %s/%s not found", tmp, cycle_name); return(-1);
   }
   sprintf(tmp,"/PPG/Cycles/%s/PPGcodes", cycle_name);
   if( (status=db_find_key(hDB, 0, tmp, &hKey)) != DB_SUCCESS){
     cm_msg(MINFO,"FE","Key %s not found", tmp); return(-1);
   }
   size=sizeof(ppg_codes);
   if( (db_get_data(hDB,hKey,&ppg_codes,&size,TID_INT)) != DB_SUCCESS){
      cm_msg(MINFO,"FE","Can't get data for Key %s", tmp); return(-1);
   }
   for(i=size/4; i<NUM_PATTERN; i++){ ppg_codes[i] = 0; } // clear unused
   sprintf(tmp,"/PPG/Cycles/%s/durations", cycle_name);
   if( (status=db_find_key(hDB, 0, tmp, &hKey)) != DB_SUCCESS){
      cm_msg(MINFO,"FE","Key %s not found", tmp); return(-1);
   }
   size=sizeof(ppg_durations);
   if( (db_get_data(hDB,hKey,&ppg_durations,&size,TID_INT)) != DB_SUCCESS){
      cm_msg(MINFO,"FE","Can't get data for Key %s", tmp); return(-1);
   }
   printf("   clearing network buffers ");
   while( readmsg(cmd_socket) > 0 ){ printf("."); }
   printf("\n");

   for(i=size/4; i<NUM_PATTERN; i++){ ppg_durations[i] = 0; } // clear unused
   if( master_grifc ){
     printf("   Writing ppg patterns ...\n");
     for(i=   0; i<NUM_PATTERN; i++){  // par, W/Rn, chan, val // ABG- change from i<size/4;
       param_encode(msgbuf, 128+2*i, WRITE, GRIFC_PPGPAR, ppg_durations[i] );
       printf("ppg_duration[%d] = %d, %d, %p, %s\n", i,ppg_durations[i],cmd_socket,&cmd_addr,msgbuf);
       if( (size = sndmsg(cmd_socket, &cmd_addr, msgbuf, 12, replybuf)) != 4 ){
	 cm_msg(MINFO,"FE","failed to write ppg duration %d [%d bytes:%s]", i, size, replybuf); return(-1);
       }
       printf("   reply      :%d bytes ...", size); printreply(size);
       param_encode(msgbuf, 128+2*i+1, WRITE, GRIFC_PPGPAR, ppg_codes[i] );
       printf("ppg_code[%d] = %d, %d, %p, %s\n", i,ppg_codes[i],cmd_socket,&cmd_addr,msgbuf);
       if( (size = sndmsg(cmd_socket, &cmd_addr, msgbuf, 12, replybuf)) != 4 ){
	 cm_msg(MINFO,"FE","failed to write ppg code %d [%d bytes:%s]", i, size, replybuf); return(-1);
       }
       printf("   reply      :%d bytes ...", size); printreply(size);
     }
   }
   return(0);
}

// can have separate stream for scalars
int read_scalar_data(int module, int *pdata);
INT read_scalar_event(char *pevent, INT off)
{
   int i, *pdata, fail;
   //   int size,status; char tmp[STRING_LEN]; HNDLE hKey;

   // return(0); // disabling scaler readout

   /*
   // Grab all the current EPICS variables
   sprintf(tmp,"/Equipment/Epics/Variables/MSRD");
   if( (status=db_find_key(hDB, 0, tmp, &hKey)) != DB_SUCCESS){
     cm_msg(MINFO,"FE","Key %s not found", tmp); return(-1);
   }
   size=sizeof(EPICS_Rates);
   if( (db_get_data(hDB,hKey,&EPICS_Rates,&size,TID_FLOAT)) != DB_SUCCESS){
      cm_msg(MINFO,"FE","Can't get data for Key %s", tmp); return(-1);
   }
   */

   bk_init(pevent);
   bk_create(pevent, "SCLR", TID_DWORD, &pdata);
   
   // if socket closes during run - reopen and retry read up to twice
   // (but fail immediately if open unsuccessful)
   for(i=0; i<5; i++){
     if( grif16_fd[i] == -1 ){ continue; } // skip any failed cards
      fail = 0;
      while(1){
	if( read_scalar_data(i, pdata) == 0 ){ pdata += 82; break; }
        if( ++fail > 2 || (grif16_fd[i] = open_tcp_socket(grif16_name[i],
                       GRIF16_PORT, &grif16_addr[i])) == -1 ){ break; }
      }
   }

   bk_close(pevent, pdata);

   /*
   // Subtract the last values so we get a rate
   for(i=0; i<11; i++){
     EPICS_Rates[i] -= last_Rates[i];
     last_Rates[i] = EPICS_Rates[i];
   }
   // Copy EPICS scalar values to ODB
   sprintf(tmp,"/Equipment/Epics/Variables/MSRD");
   size = sizeof(EPICS_Rates);
   if( (db_set_value(hDB,0,tmp,&EPICS_Rates,size,40,TID_FLOAT)) != DB_SUCCESS){
     cm_msg(MINFO,"FE","Can't set value for Key %s",tmp); return(-1);}
   */

   return bk_size(pevent); 
}
static char *sendbuf="GET /report_trigger_count HTTP/1.1\r\nConnection: Keep-Alive\r\n\r\n";
// scalar data is in form "4\r\nXXXX\r\n" (not sure of byte order of XXXX)
// data ends with "0\r\n\r\n"
int read_scalar_data(int module, int *pdata)
{
   int i, j, bytes, offset, send_flags = 0;
   if( (bytes = sendto(grif16_fd[module], sendbuf, strlen(sendbuf), send_flags, 
      (struct sockaddr *)&grif16_addr[module], sizeof(struct sockaddr))) < 0 ){
      close(grif16_fd[module]); grif16_fd[module] = -1; return(-1);
   }
   if( testmsg(grif16_fd[module], 100000) <= 0 ){
      close(grif16_fd[module]); grif16_fd[module] = -1; return(-1);
   }
   if((bytes=recvfrom(grif16_fd[module],replybuf,MAX_EVT_SIZE,0,NULL,NULL))<=0){
      close(grif16_fd[module]); grif16_fd[module] = -1; return(-1);
   }
   for(j=0; j<bytes; j++){ // skip http response headers up to empty line
      if( memcmp( &replybuf[j], "\r\n\r\n", 4) == 0 ){ j += 4; break; }
   }
   offset = j;
   if( bytes - j < 725 ){ // should be 80 items plus header and trailer plus empty item at end
      fprintf(stdout,"not enough data returned for scalar %d\n", module);
      close(grif16_fd[module]); grif16_fd[module] = -1; return(-1);
   }
   *(pdata++) = 0x80000FFF | (module << 12);
   for(i=0; i<16; i++){
      for(j=0; j<5; j++){
         *(pdata++) = *(int *)&replybuf[9*(5*i+j) + 4 + offset - 1];

	 /*
	 // Collect scalar values to put into EPICS via ODB
	 // All Beta
	 if(module==2 && j==1){ EPICS_Rates[1] += *(int *)&replybuf[9*(5*i+j) + 4 + offset - 1]; }
	 // All HPGe
	 if(module!=2 && j==1){
	   EPICS_Rates[0] += *(int *)&replybuf[9*(5*i+j) + 4 + offset - 1];
	   if(module==1 && i<4){ EPICS_Rates[5] += *(int *)&replybuf[9*(5*i+j) + 4 + offset - 1]; } // HPGe 01
	   if(module==1 && i>7 && i<12){ EPICS_Rates[6] += *(int *)&replybuf[9*(5*i+j) + 4 + offset - 1]; } // HPGe 03
	   if(module==3 && i<4){ EPICS_Rates[7] += *(int *)&replybuf[9*(5*i+j) + 4 + offset - 1]; } // HPGe 05
	   if(module==4 && i<4){ EPICS_Rates[8] += *(int *)&replybuf[9*(5*i+j) + 4 + offset - 1]; } // HPGe 09
	   if(module==4 && i>11){ EPICS_Rates[9] += *(int *)&replybuf[9*(5*i+j) + 4 + offset - 1]; } // HPGe 12
	   if(module==0 && i>7 && i<12){ EPICS_Rates[10] += *(int *)&replybuf[9*(5*i+j) + 4 + offset - 1]; } // HPGe 15
	   
	 }
         */
      }
   }
   *(pdata++) = 0xE0000FFF | (module << 12);

   return(0);
}

int read_grifc_event(char *pevent, int tig4g_id);
int read_trigger_event(char *pevent, int off)
{
   static int grifc_id=0;
   return( read_grifc_event(pevent, grifc_id) ); // return 0; discards event? */
}

static char multi_evt_buf[MAX_EVT_SIZE]; int multi_evt_pos;
static char progress[] = "|/-\\";
int read_grifc_event(char *pevent, int grifc_id)
{
   static int i_bar, last_update, lastev_count, ev_count;
   int *pdata, *ptr, words, pkt_num=0, mid_count; 
   static int lastpkt_count, lastmid_count;
   time_t curr_time = time(NULL);

   // packetnumber is removed from replybuf and returned as pkt_num argument
   grifc_eventread(data_socket, 0x1234, (int *)replybuf, &words, &pkt_num);
   if( words < 1 ){ return(0); }
   pkt_num = 0xD0000000 | (pkt_num & 0xfffffff);
   ++ev_count;

   ptr = (int *)(multi_evt_buf+multi_evt_pos);
   if( words < 5 ){
      memcpy(ptr, replybuf, words*4);
      multi_evt_pos += words*4;
   } else { // insert packet number after 4th word
      multi_evt_pos += (words+1)*4;
      memcpy(ptr, replybuf, 4*4); ptr += 4; words -=4; *ptr++ = pkt_num;
      memcpy(ptr, replybuf +4*4, words*4); ptr += words;
   }
   if( multi_evt_pos < TARGET_EVENT_SIZE && curr_time == last_update ){ return(0); }
   
   bk_init(pevent);
   bk_create(pevent, "GRF2", TID_DWORD, &pdata);
   memcpy(pdata, multi_evt_buf, multi_evt_pos); pdata += multi_evt_pos/4;
   bk_close(pevent, pdata);
   multi_evt_pos = 0;

   if( curr_time != last_update ){
      mid_count = SERIAL_NUMBER(pevent);
      printf(" %c -", progress[i_bar++%4] );  
      printf(" Midas:%d[%d/s] -", mid_count, mid_count - lastmid_count );
      printf(" Frag:%6d/s -", ev_count-lastev_count );
      printf(" Pkt:%6d/s -", pkt_num-lastpkt_count );
      printf("%c", ( (i_bar % 1000) ) ? '\r' : '\n' );
      last_update = curr_time;
      lastev_count = ev_count;
      lastpkt_count = pkt_num;
      lastmid_count = mid_count;
   }

   printf(" %c - Serial:%d [", progress[i_bar++%4],SERIAL_NUMBER(pevent));
   printf("%c", ( (i_bar % 1000) ) ? '\r' : '\n' );

   return bk_size(pevent); 
}

///////////////////////////////////////////////////////////////////////////
//////////////////////      network data link      ////////////////////////

int sndmsg(int sock_fd, struct sockaddr_in *addr, char *message, int msglen, char *reply)
{
   struct sockaddr_in client_addr;
   int bytes, flags=0;

   if( (bytes = sendto(sock_fd, message, msglen, flags,
        (struct sockaddr *)addr, addr_len) ) < 0 ){
      fprintf(stderr,"sndmsg: sendto failed\n");
      return(-1);
   }
   if( reply == NULL ){ return(0); } // we don't expect any response
   if( testmsg(sock_fd, 10000) <= 0 ){  // wait 10ms for msg
     fprintf(stderr,"sndmsg: reply expected, but no reply received\n");
      return(-1);
   }
   if( (bytes = recvfrom(sock_fd, reply, max_event_size, flags,
        (struct sockaddr *) &client_addr, (socklen_t *)&addr_len) ) == -1 ){
      fprintf(stderr,"sndmsg: reply expected, but no reply received\n");
      return(-1); 
   }
   return(bytes);
}

// select: -ve=>error, zero=>no-data +ve=>data-avail
int testmsg(int socket, int timeout)
{
   int num_fd; fd_set read_fds;
   struct timeval tv;

   tv.tv_sec = 0; tv.tv_usec = timeout;
   num_fd = 1; FD_ZERO(&read_fds); FD_SET(socket, &read_fds);
   return( select(socket+1, &read_fds, NULL, NULL, &tv) );
}

// reply pkts have 16bit dword count, then #count dwords
int readmsg(int socket)
{
   struct sockaddr_in client_addr;
   int bytes;

   if( testmsg(socket, 10000) <= 0 ){ return(-2); } // wait 10ms for msg
   if( (bytes = recvfrom(socket, replybuf, max_event_size, 0,
        (struct sockaddr *) &client_addr, (socklen_t *)&addr_len) ) == -1 ){
       return -1;
   }
   return( bytes );
}

int open_udp_socket(char *host, int server_port, struct sockaddr_in *addr)
{
   struct sockaddr_in local_addr;
   struct hostent *hp;
   int sock_fd;

   int mxbufsiz = 0x00800000; /* 8 Mbytes ? */
   int sockopt=1; // Re-use the socket
   if( (sock_fd = socket(AF_INET, SOCK_DGRAM, 0)) < 0 ){
      fprintf(stderr,"udptest: ERROR opening socket\n");
      return(-1);
   }
   setsockopt(sock_fd, SOL_SOCKET, SO_REUSEADDR, &sockopt, sizeof(int));
   if(setsockopt(sock_fd, SOL_SOCKET,SO_RCVBUF, &mxbufsiz, sizeof(int)) == -1){
      fprintf(stderr,"udptest: setsockopt for buff size\n");
      return(-1);
   }
   memset(&local_addr, 0, sizeof(local_addr));
   local_addr.sin_family = AF_INET;
   local_addr.sin_port = htons(0);          // 0 => use any available port
   local_addr.sin_addr.s_addr = INADDR_ANY; // listen to all local addresses
   if( bind(sock_fd, (struct sockaddr *)&local_addr, sizeof(local_addr) )<0) {
      fprintf(stderr,"udptest: ERROR on binding\n");
      return(-1);
   }
   // now fill in structure of server addr/port to send to ...
   bzero((char *) addr, addr_len );
   if( (hp=gethostbyname(host)) == NULL ){
      fprintf(stderr,"udptest: can't lookup ip address for host:%s\n", host);
      return(-1);
   }
   memcpy(&addr->sin_addr, hp->h_addr_list[0], hp->h_length);
   addr->sin_family = AF_INET;
   addr->sin_port = htons(server_port);

   return(sock_fd);
}

int open_tcp_socket(char *host, int server_port, struct sockaddr_in *addr )
{
   struct hostent *hp;
   int sock_fd;

   if( (sock_fd = socket(AF_INET, SOCK_STREAM, 0)) == -1){
      perror("create socket failed");
      return(-1);
   }
   if( (hp=gethostbyname(host)) == NULL){
      perror("get hostname failed");
      close(sock_fd);
      return(-1);
   }
   memset((char *)addr, 0, sizeof(struct sockaddr) );
   addr->sin_family = AF_INET;
   addr->sin_port = htons(server_port);
   memcpy((char *)&addr->sin_addr, hp->h_addr_list[0], hp->h_length);

   if( connect(sock_fd,(struct sockaddr *)addr,sizeof(struct sockaddr)) == -1){
      perror("connect failed");
      close(sock_fd);
      return(-1);
   }
   return(sock_fd);
}

///////////////////////////////////////////////////////////////////////////
//////////////////////        Event assembly       ////////////////////////

/* There is often leftover data after end of an event(start of next event) */
/* Another data transfer will be needed to complete this partial event */
/* Don't want to copy data elsewhere to enable reusing data rcv buffer */
/* - Could have 2 buffers, and write to empty one.  To make sure always have */
/*   an empty one, each would have to be bigger than max vf48 eventsize */
/* Or could just use single buffer >= 3*max eventsize, write to start/end */
/* BUT rcv buffer size here is 1Mbyte, can use this directly as write buffer */
/*             each data transfer could get many events -  */
/*             complete 1 and copy rest ofdata to local buffer */
/* data buffer could be reused for other modules so cannot avoid this copy */
/* each call to this function look for complete events and return, */
/* or get new data, find rest of event, copy remaining data and return */
/* complicated to use circular buffer (may consider if absolutely necessary) */
/* so use single buffer 2*Max_eventsize, and copy any unused data to start */

#define EVTBUFSIZ  65536 /* max event  */
#define MAX_MODULES    4 /* will not have more than 4 grifc's ? */
typedef struct eventbuf_struct {
  int module_addr;
  int *data;
  int bufpos; /* first valid data */
  int buflen; /* end of valid data */
} EventBuf;
static EventBuf eventbuf[MAX_MODULES];

EventBuf *find_buffer(int module_address)
{
   EventBuf *ptr;
   int i;
   /* find correct buffer for this module */
   for(i=0; i<MAX_MODULES; i++){
      ptr = eventbuf+i;
      if( ptr->module_addr == module_address ){ break; }
      if( ptr->data != NULL ){ continue; }
      /* reached end of allocated buffers - make new one */
      if( (ptr->data = malloc(EVTBUFSIZ*2*sizeof(int))) == NULL ){ /*!!*2!!*/
         printf("EventRead: can't alloc memory for event reconstr. buffer\n");
         return NULL;
      }
      ptr->module_addr = module_address; break;
   }
   if( i == MAX_MODULES ){
      printf("EventRead: All event reconstruction buffers in use\n");
      return NULL;
   }
   return(ptr);
}

void  grifc_eventread_init() /* dump old data from buffers after end of run */
{
   int i;
   for(i=0; i<MAX_MODULES; i++){
      eventbuf[i].bufpos = eventbuf[i].buflen = 0;
   }
}

int event_item_offset(int *data, int len, int item)
{
   int i = -1;
   while( ++i < len ){
     if( (data[i] & 0xF0000000) == item ){ return(i); }
   }
   return(-1);
}

int dump_data_buffers(int data_socket)
{
   int i, j, count, words, pkt_num;
   fprintf(stdout,"flushing leftover data ...\n");
   for(i=0,j=0,count=0; (j<10000 && i<100); i++,j++){// wait for 100 reads with no data
      grifc_eventread(data_socket, 0x1234, (int *)replybuf, &words, &pkt_num);
      if( words >= 1 ){ ++count; i=0; }
   }
   if( j<10000 ){fprintf(stdout,"done");} else {fprintf(stdout,"failed");}
   fprintf(stdout, " [%04d]\n", count);
   return(0);
}

#define GRIF_HEADER  0x80000000
#define GRIF_TRAILER 0xE0000000

// read a single chunk of data (contents of single network packet)
// readmsg limits response to max_event_size[500K]
// readmsg puts data in replybuf
static char prevreply[MAX_EVT_SIZE], prevprevreply[MAX_EVT_SIZE];
static int  prevreplybytes, prevprevreplybytes;
int grifc_dataread(int data_socket, char *ptr)
{
  //static char *firstptr;
  //static int pkt;
   int bytes;

   if(  testmsg(data_socket, 10000)  < 0 ){ return(0); }

   memcpy(prevprevreply, prevreply, prevreplybytes);
   prevprevreplybytes = prevreplybytes;
   memcpy(prevreply, replybuf, replybufbytes);
   prevreplybytes = replybufbytes;

   if( ( bytes=readmsg(data_socket)) < 2 ){ return(0); }
   // data packets are now all data - should be multiple of 4 bytes
   memcpy(ptr, replybuf, bytes);  replybufbytes = bytes;

   if( debug_data ){
      fprintf(stdout,"grifc_dataread: received data packet: %d bytes\n", bytes);
      int i; for(i=0; i<(bytes+3)/4; i++){
         fprintf(stdout,"  0x%08x%s", *(((int *)ptr)+i), (((i+1)%6)?"":"\n") );
      }
      fprintf(stdout,"%s\r", ((i%6)?"\n":"") );
   }

   return( (bytes+3)/4 ); // units of 32bit (4byte) words (round up)
}

void discarded_data(int *data, int offset, int address)
{
   int i;

   //return;

   printf("EventRead: Module 0x%06x: Discarded ", address);
   printf("%d data words looking for Event Header\n    ", offset );
   for(i=0; i<offset; i++){
     //if( ((i+1) % 8) == 0 ){ printf("\n    "); }
      printf("  0x%08x", data[i] );
   }
   //if( (i % 8) != 0 ){printf("\n"); }
   
   fprintf(stdout,"PrevPrev data packet: %d bytes\n", prevprevreplybytes);
   for(i=0; i<(prevprevreplybytes+3)/4; i++){
      fprintf(stdout,"  0x%08x%s", *(((int *)prevprevreply)+i), (((i+1)%6)?"":"\n") );
   }
   fprintf(stdout,"%s\r", ((i%6)?"\n":"") );
      
   fprintf(stdout,"Previous data packet: %d bytes\n", prevreplybytes);
   for(i=0; i<(prevreplybytes+3)/4; i++){
      fprintf(stdout,"  0x%08x%s", *(((int *)prevreply)+i), (((i+1)%6)?"":"\n") );
   }
   fprintf(stdout,"%s\r", ((i%6)?"\n":"") );
      
   fprintf(stdout,"Current data packet: %d bytes\n", replybufbytes);
   for(i=0; i<(replybufbytes+3)/4; i++){
      fprintf(stdout,"  0x%08x%s", *(((int *)replybuf)+i), (((i+1)%6)?"":"\n") );
   }
   fprintf(stdout,"%s\r", ((i%6)?"\n":"") );

   printf("\n");
}

int grifc_eventread(int data_socket, int addr, int *pdest, int *nentry, int *pkt_num)
{
   int i, offset, bufpos, buflen, *data;
   EventBuf *ptr;

   *nentry = 0; data_available = 0;
   if( (ptr = find_buffer(addr)) == NULL){ return(0); }
   data = ptr->data; bufpos = ptr->bufpos; buflen = ptr->buflen;

   // #################  Find event header    #################
   offset = event_item_offset(data+bufpos, buflen-bufpos, GRIF_HEADER);
   if( offset == 1 ){ *pkt_num = data[bufpos++]; offset=0; }
   if( offset > 0 ){ discarded_data(data+bufpos,offset,addr); bufpos+=offset; }
   if( offset== -1){ /* reached end of data, no header found */
                     /* read more data and try again */
      if( (i=grifc_dataread(data_socket, (char *)data)) <= 0 ){ return(0); }
      bufpos = 0; ptr->buflen = buflen = i;
      offset = event_item_offset(data+bufpos, buflen-bufpos, GRIF_HEADER);
      if( offset == 1 ){ *pkt_num = data[bufpos++]; offset=0; }
      if( offset > 0){ discarded_data(data+bufpos,offset,addr);bufpos+=offset;}
      if( offset==-1){ ptr->bufpos = bufpos; return(0); }
   }
   // #################  Find event trailer    #################
   offset = event_item_offset(data+bufpos, buflen-bufpos, GRIF_TRAILER);
   if( offset == -1 ){ /* reached end of data, no trailer found */
                       /* read more data and try again */
     if( buflen + 64 >= EVTBUFSIZ ){ // just use 64 for now - small enough
	 // The buffer hasnt enough room - maybe there is lots of junk at start
         // relocate good data to buffer start, to make room for rest of event
	 memmove(data, data+bufpos, buflen-bufpos); buflen-=bufpos; bufpos=0;
      }
      //if( buflen + nframe >= EVTBUFSIZ ){ nframe = EVTBUFSIZ - buflen; }
      if((i=grifc_dataread(data_socket,(char *)(data+buflen)))<=0){return(0);}
      buflen += i; ptr->buflen = buflen;
      offset = event_item_offset(data+bufpos, buflen-bufpos, GRIF_TRAILER);
      if( offset == -1 ){ ptr->bufpos = bufpos; return(0); }
   }
   // #################       Store event       #################
   ++offset; *nentry = offset; while( offset-- ){ *pdest++ = data[bufpos++]; }
   ptr->bufpos = bufpos;
   data_available = (buflen > bufpos);
   return( data_available ); // more data available
}

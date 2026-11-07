/* xdrive: pointer and keys for the one window on a private X display, by XTest.
 *   xdrive geometry            x y width height of the window
 *   xdrive click X Y           left click at X,Y in window pixels
 *   xdrive move X Y            pointer to X,Y
 *   xdrive scroll X Y N        N wheel steps at X,Y: down when N > 0, up when N < 0
 *   xdrive type TEXT           type printable ASCII
 *   xdrive key NAME            press one key by keysym name: Return, Escape
 * DISPLAY names the private server; input.sh refuses the owner's. */
#include <X11/XKBlib.h>
#include <X11/Xlib.h>
#include <X11/extensions/XTest.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

static int biggest(Display *d, int *x, int *y, int *w, int *h) {
  Window root = DefaultRootWindow(d), r, p, *kids = NULL;
  unsigned n = 0;
  long best = 0;
  if (!XQueryTree(d, root, &r, &p, &kids, &n)) return 0;
  for (unsigned i = 0; i < n; i++) {
    XWindowAttributes a;
    if (!XGetWindowAttributes(d, kids[i], &a) || a.map_state != IsViewable) continue;
    if ((long)a.width * a.height > best) {
      best = (long)a.width * a.height;
      *x = a.x; *y = a.y; *w = a.width; *h = a.height;
    }
  }
  if (kids) XFree(kids);
  return best > 0;
}

static void press(Display *d, KeySym ks) {
  KeyCode kc = XKeysymToKeycode(d, ks);
  if (!kc) { fprintf(stderr, "xdrive: no key for keysym %lu\n", ks); exit(1); }
  int shift = XkbKeycodeToKeysym(d, kc, 0, 0) != ks;
  KeyCode sh = XKeysymToKeycode(d, XStringToKeysym("Shift_L"));
  if (shift) XTestFakeKeyEvent(d, sh, True, 0);
  XTestFakeKeyEvent(d, kc, True, 0);
  XTestFakeKeyEvent(d, kc, False, 0);
  if (shift) XTestFakeKeyEvent(d, sh, False, 0);
  XSync(d, False);
  usleep(15000);
}

int main(int argc, char **argv) {
  if (argc < 2) { fprintf(stderr, "usage: xdrive geometry|click X Y|move X Y|scroll X Y N|type TEXT|key NAME\n"); return 2; }
  Display *d = XOpenDisplay(NULL);
  if (!d) { fprintf(stderr, "xdrive: cannot open display %s\n", getenv("DISPLAY")); return 1; }
  int ev, er, ma, mi;
  if (!XTestQueryExtension(d, &ev, &er, &ma, &mi)) { fprintf(stderr, "xdrive: no XTest\n"); return 1; }
  int x = 0, y = 0, w = 0, h = 0;
  if (!biggest(d, &x, &y, &w, &h)) { fprintf(stderr, "xdrive: no window mapped\n"); return 1; }
  const char *cmd = argv[1];
  if (!strcmp(cmd, "geometry")) {
    printf("%d %d %d %d\n", x, y, w, h);
  } else if ((!strcmp(cmd, "click") || !strcmp(cmd, "move")) && argc == 4) {
    XTestFakeMotionEvent(d, -1, x + atoi(argv[2]), y + atoi(argv[3]), 0);
    XSync(d, False);
    usleep(80000);
    if (!strcmp(cmd, "click")) {
      XTestFakeButtonEvent(d, 1, True, 0);
      XSync(d, False);
      usleep(60000);
      XTestFakeButtonEvent(d, 1, False, 0);
    }
  } else if (!strcmp(cmd, "scroll") && argc == 5) {
    XTestFakeMotionEvent(d, -1, x + atoi(argv[2]), y + atoi(argv[3]), 0);
    XSync(d, False);
    usleep(80000);
    int n = atoi(argv[4]), button = n < 0 ? 4 : 5;
    for (int i = 0; i < abs(n); i++) {
      XTestFakeButtonEvent(d, button, True, 0);
      XTestFakeButtonEvent(d, button, False, 0);
      XSync(d, False);
      usleep(30000);
    }
  } else if (!strcmp(cmd, "type") && argc == 3) {
    for (const char *c = argv[2]; *c; c++) press(d, *c == ' ' ? XStringToKeysym("space") : (KeySym)(unsigned char)*c);
  } else if (!strcmp(cmd, "key") && argc == 3) {
    KeySym ks = XStringToKeysym(argv[2]);
    if (ks == NoSymbol) { fprintf(stderr, "xdrive: unknown key %s\n", argv[2]); return 2; }
    press(d, ks);
  } else {
    fprintf(stderr, "xdrive: bad arguments\n");
    return 2;
  }
  XSync(d, False);
  XCloseDisplay(d);
  return 0;
}

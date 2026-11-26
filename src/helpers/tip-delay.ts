/**
 * How long the first tooltip waits, in ms: about 800, everywhere, the folded
 * rail included (the owner's pick on 2026-11-25). A pointer crossing a
 * toolbar on its way to a file sets off no names nobody asked for. Once one
 * is up, a neighbour opens at once and with no entrance, which is Base UI's
 * delay group: the app's `<TooltipProvider>` around the controls, and
 * `data-instant` on the neighbour's popup.
 *
 * The tooltip itself stays each app's own (ported from notes), so the kit
 * hands over the number:
 *
 *   <TooltipPrimitive.Provider delay={TIP_DELAY_MS} timeout={TIP_GROUP_MS} />
 *
 * Script, not a token: the wait is Base UI's timer, and no stylesheet value
 * reaches it.
 */
export const TIP_DELAY_MS = 800;

/**
 * How long a tooltip group stays warm after its tooltip closes, so the next
 * one in the group still opens at once: Base UI's own default, named here
 * so all four apps say the same.
 */
export const TIP_GROUP_MS = 400;

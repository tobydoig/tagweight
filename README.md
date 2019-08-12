# tagweight
A Chrome debug plugin which shows a graph of the items (scripts, images, iframes etc)
loaded on a page and their dependencies. The graph is live, so as you interact more items may be loaded/shown.

  ![tagweight screenshot](/docs/screenshot.png)

The primary purpose of the tool is to see what advertising is being loaded on a page and to reduce page weight, although
it can be used for general investigations and debugging.

Inspiration came from another debug tool/plugin I saw around 2014, I think from Ghostery, that did
a similar thing (but better). Couldn't find the plugin so thought I'd give it a go.

# Usage
At this stage it's not packaged as a separate plugin, but installing it is trivial.

1. First grab the code

    `git clone git@github.com:tobydoig/tagweight.git`

2. Within Chrome, open the extensions window in the browser

  ![Extensions menu](/docs/extensions.png)

3. Click the "Load unpacked" button. You'll now see a warning message appear in your Chrome tabs. This is telling you that the plugin can (or could) see any all data being transferred. Please see the "Security" section below for security implications.

  ![Calculate weight menu](/docs/debugging.png)

4. Select the tagweight folder you cloned above
5. Choose a tab to debug and then click the scales icon and click "Calculate Weight".
6. A new unattractively-styled window (the "output" window) will open. This is where the graph will be shown.

  ![Calculate weight menu](/docs/calcweight.png)

7. Refresh the tab you want to graph.

# The Display
The main page is the central node (dot) with the title in red. Resources directly loaded by and added to that page are connected directly to it.
If an IFRAME is loaded then any items loaded inside that IFRAME are shown as children of it rather than the parent page (or parent IFRAME if
there are several layers).

A green edge (line) means the item is still loading, and then turns black. Edges which remain green are a bug and a
result of there being no "finished loading" event (or, omre likely, my lack of understanding/patience for the API). Thicker edges means they took
longer to load (this needs work).

A grey node means loaded properly, whereas red means a load error (which can sometimes be intentional by the code loading the resource).
Bigger nodes means heavier resources (more bytes).

Typically there's a lot of stuff on a web page so you'll need to zoom in/out (mouse wheel) and drag around (left-click drag).
Moving your mouse own a node will show a load of JSON data on the right panel. You can also click/drag nodes, for what it's worth.

# How does it work
The plugin uses the Chrome DevTools Protocol to access low-level event data to see what the browser is doing. This data is then used to track the loading
of resources. The plugin registers for these events and then passes them to the output window which then filters/displays the results.
If you open the debug console in the output window then you'll see the raw event data being written out.

Currently it listens to Network and Page events.

When the plugin is loaded the background.js page calls chrome.runtime.onConnect.addListener() to start listening to connection events from
other pages inside the plugin. Meantime the tagweight icon is added to the bar which, when clicked, loads/shows the browserAction.html page. When
the calculate button is pressed it sends an event to the background page with the window and tab id's. This is where we start listening to events
for that tab via a call to chrome.debugger.attach(), and we also stop listening to events from a previously debugged tab if relevant. We open a new
window with tagweight.html and pass the debug events from background.js to a handler in tagweight.js via tagWeightDetails.tagPort.postMessage() calls. 
Events to tagweight.js are mostly sent through to graphing.js which is where the display itself happens. We use the [Cytoscape.js](https://js.cytoscape.org/)
library to handle the graphing.

The JSON output you see in the right-hand status panel is essentially the event data we get from Chrome DevTools Protocol.

# Security
Yes this plugin sees all the data unencrypted for the debugged tab. It only registers to see data from the debugged tab, not the other tabs. It could but
it doesn't because it's unecessary and would be very inefficient. It does not copy/transfer any data from your machine, it all stays local. In fact it
doesn't even load any remote code, it's all contained in the folder on your machine.

That said, this is a debug tool for engineers. It's of little value to general users.

# Code sucks
I know. So does the UI. It was a quick hack rather than a focused effort. Chipping away here 'n there, focusing on getting things to work rather than
look pretty. But don't sit there poking holes, that's easy. Help make it better.

# License
MIT


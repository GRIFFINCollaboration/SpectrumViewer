# generate SpectrumViewer flow charts.
# deps: install.packages('DiagrammeR')

library(DiagrammeR)

# Spectrum Viewer
nodes <-
  create_nodes(nodes = c('x-plot-list', 'x-plots', 'x-plot-control', 'x-aux-plot-control'),
               x = c(0, -2,  2, 0),
               y = c(0, -2, -2, -4),
               fillcolor ="lightgreen")

edges <-
  create_edges(from =  c("x-plot-list",    "x-plots",        "x-plots",            "x-plot-control",     "x-plots",        "x-plots",        "x-plots"),
               to =    c("x-plot-control", "x-plot-control", "x-aux-plot-control", "x-aux-plot-control", "x-plot-control", "x-plot-control", "x-aux-plot-control"),
               label = c('requestPlot',    'newCell',        'newCell',            'addPlotRow',         'deleteCell',     'attachCell',     "deleteCell"),
               relationship = "leading_to")

graph <-
  create_graph(nodes_df = nodes,
               edges_df = edges,
               graph_attrs = "layout = neato",
               node_attrs = c("fontname = Helvetica",
                              "style = filled"),
               edge_attrs = c("color = gray20",
                              "arrowsize = 0.5"))
render_graph(graph)


# Rate Monitor
nodes <-
  create_nodes(nodes = c('x-plots', 'x-plot-control', 'x-graph', 'x-rate-slider', 'x-rate-control'),
               x = c(0, -1, 2,  3,  0),
               y = c(0, -2, 0, -2, -4),
               fillcolor ="lightgreen")

edges <-
  create_edges(from =  c("x-plots",        "x-rate-control", "x-rate-control"),
               to =    c("x-plot-control", "x-graph",        "x-graph"),
               label = c('attachCell',     'setDyVisible',   'updateDyData'),
               relationship = "leading_to")

graph <-
  create_graph(nodes_df = nodes,
               edges_df = edges,
               graph_attrs = "layout = neato",
               node_attrs = c("fontname = Helvetica",
                              "style = filled"),
               edge_attrs = c("color = gray20",
                              "arrowsize = 0.5"))
render_graph(graph)

# Gain Matcher
nodes <-
  create_nodes(nodes = c('x-gain-match-report', 'x-plots', 'x-plot-list-lite', 'x-plot-control', 'x-graph'),
               x = c(-1, -2,  3, -1,  1),
               y = c( 0, -2, -2, -4, -4),
               fillcolor ="lightgreen")

edges <-
  create_edges(from =  c("x-plots",        "x-gain-match-report", "x-gain-match-report"),
               to =    c("x-plot-control", "x-graph",             "x-plot-list-lite"),
               label = c('attachCell',     'updateDyData',        'fitAllComplete'),
               relationship = "leading_to")

graph <-
  create_graph(nodes_df = nodes,
               edges_df = edges,
               graph_attrs = "layout = neato",
               node_attrs = c("fontname = Helvetica",
                              "style = filled"),
               edge_attrs = c("color = gray20",
                              "arrowsize = 0.5"))
render_graph(graph, output = 'graph')


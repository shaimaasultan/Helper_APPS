# import osmnx as ox
# G = ox.graph_from_place("Mississauga, Ontario, Canada", network_type="drive")
# ox.save_graph_geopackage(G, filepath="roads.gpkg")


import geopandas as gpd

gdf = gpd.read_file("roads.gpkg", layer="edges")
gdf.to_file("roads.geojson", driver="GeoJSON")

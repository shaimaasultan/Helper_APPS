import math

a = (1/555555)
print(a/180)
b = (a/180)/180

print(f"{b:.40e}")


import numpy as np

np.set_printoptions(suppress=False, formatter={'float_kind': '{:.40e}'.format})
arr = np.array([b])
print(arr)

import pandas as pd

df = pd.DataFrame({'value': [b]})
pd.options.display.float_format = '{:.40e}'.format
print(df)
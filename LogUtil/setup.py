from setuptools import setup, find_packages

setup(
    name='local_logger',
    version='0.1.0',
    packages=find_packages(where="C:/LogUtil"),
    install_requires=[
        'python-dotenv',  # if you're using .env
        'colorlog',       # optional for colored output
    ],
    author='ShaimaaSoltan',
    description='Custom logging utility with config and env support',
    include_package_data=True
)
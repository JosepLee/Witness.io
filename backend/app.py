from flask import Flask
from flask_restx import Api
from flask_cors import CORS

from api.theaters import ns as theaters_ns
from api.sites import ns as sites_ns


def create_app():
    app = Flask(__name__)
    CORS(app, origins=["http://localhost:5173", "http://127.0.0.1:5173"])

    api = Api(
        app,
        version="1.0",
        title="WITNESS API",
        description="态势分析后端接口",
        doc="/docs",
        prefix="/api",
    )
    api.add_namespace(theaters_ns)
    api.add_namespace(sites_ns)

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5001, debug=True)

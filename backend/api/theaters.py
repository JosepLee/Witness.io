import json
from flask_restx import Namespace, Resource
from db import get_db

ns = Namespace("theaters", description="专题接口", path="/theaters")


@ns.route("")
class TheaterList(Resource):
    def get(self):
        """获取所有专题列表"""
        db = get_db()
        rows = db.execute("SELECT id, label, label_en, flag, camera_json FROM theater").fetchall()
        result = []
        for r in rows:
            site_count = db.execute(
                "SELECT COUNT(*) FROM geo_pos WHERE theater_id = ?", (r["id"],)
            ).fetchone()[0]
            result.append({
                "id": r["id"],
                "label": r["label"],
                "labelEn": r["label_en"],
                "flag": r["flag"],
                "camera": json.loads(r["camera_json"]),
                "siteCount": site_count,
            })
        db.close()
        return result


@ns.route("/<string:theater_id>/sites")
class TheaterSites(Resource):
    def get(self, theater_id):
        """获取专题下的基地列表"""
        db = get_db()
        rows = db.execute(
            """SELECT id, numeric_id, name, lat, lng, country, type, status, strategic_value, score_json
               FROM geo_pos WHERE theater_id = ? ORDER BY id""",
            (theater_id,),
        ).fetchall()
        db.close()
        result = []
        for r in rows:
            score = json.loads(r["score_json"])
            result.append({
                "id": r["id"],
                "numeric_id": r["numeric_id"],
                "name": r["name"],
                "lat": r["lat"],
                "lng": r["lng"],
                "country": r["country"],
                "type": r["type"],
                "status": r["status"],
                "strategic_value": r["strategic_value"],
                "aci": score.get("aci", 0),
                "combatScore": score.get("combatScore", 0),
            })
        return result

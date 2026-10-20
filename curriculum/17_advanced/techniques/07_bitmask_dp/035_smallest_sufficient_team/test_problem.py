from solution import smallest_sufficient_team


def test_smallest_sufficient_team_single_skill():
    req_skills = ["java"]
    people = [["java"]]
    result = smallest_sufficient_team(req_skills, people)
    assert result == [0]


def test_smallest_sufficient_team_normal():
    req_skills = ["java", "nodejs", "reactjs"]
    people = [["java"], ["nodejs"], ["nodejs", "reactjs"]]
    result = smallest_sufficient_team(req_skills, people)
    covered = set()
    for person in result:
        covered.update(people[person])
    assert covered == set(req_skills)
    assert len(result) == 2


def test_smallest_sufficient_team_one_person_covers_all():
    req_skills = ["java", "nodejs"]
    people = [["java", "nodejs"], ["java"]]
    result = smallest_sufficient_team(req_skills, people)
    assert result == [0]

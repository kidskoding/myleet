from collections import defaultdict, deque


def find_all_recipes(recipes: list[str], ingredients: list[list[str]], supplies: list[str]) -> list[str]:
    waiting = {recipe: len(needs) for recipe, needs in zip(recipes, ingredients)}
    users: dict[str, list[str]] = defaultdict(list)
    for recipe, needs in zip(recipes, ingredients):
        for item in needs:
            users[item].append(recipe)

    made: list[str] = []
    queue = deque(supplies)
    while queue:
        item = queue.popleft()
        for recipe in users[item]:
            waiting[recipe] -= 1
            if waiting[recipe] == 0:
                made.append(recipe)
                queue.append(recipe)
    return made

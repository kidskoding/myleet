from list_node import ListNode
from solution import detect_cycle


def build_list(values: list[int]) -> ListNode | None:
    dummy = ListNode()
    curr = dummy
    for value in values:
        curr.next = ListNode(value)
        curr = curr.next
    return dummy.next


def node_at(head: ListNode | None, index: int) -> ListNode | None:
    for _ in range(index):
        head = head.next
    return head


def make_cycle(values: list[int], pos: int) -> ListNode | None:
    head = build_list(values)
    if pos < 0:
        return head
    tail = head
    while tail.next:
        tail = tail.next
    tail.next = node_at(head, pos)
    return head


def test_detect_cycle_returns_entry():
    head = make_cycle([3, 2, 0, -4], 1)
    assert detect_cycle(head) is node_at(head, 1)


def test_detect_cycle_none_when_acyclic():
    assert detect_cycle(build_list([1, 2])) is None

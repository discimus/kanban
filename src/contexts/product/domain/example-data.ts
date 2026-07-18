import { AppState, Link } from "@shared/types";

export function createExampleData(): AppState {
  const prodId = "example-prod-1";
  const now = new Date().toISOString();

  const items = [
    {
      id: "ex-bi-1",
      productId: prodId,
      title: "Implementar carrinho de compras",
      description: "Adicionar funcionalidade de carrinho com persistência local",
      priority: "high" as const,
      status: "todo" as const,
      storyPoints: 5,
      classification: "task" as const,
      createdAt: now,
      archivedAt: null,
      completedAt: null
    },
    {
      id: "ex-bi-2",
      productId: prodId,
      title: "Configurar pagamento com Stripe",
      description: "Integrar gateway de pagamento via API",
      priority: "critical" as const,
      status: "doing" as const,
      storyPoints: 8,
      classification: "task" as const,
      createdAt: now,
      archivedAt: null,
      completedAt: null
    },
    {
      id: "ex-bi-3",
      productId: prodId,
      title: "Criar página de produtos",
      description: "Listagem com busca e filtros",
      priority: "high" as const,
      status: "doing" as const,
      storyPoints: 3,
      classification: "task" as const,
      createdAt: now,
      archivedAt: null,
      completedAt: null
    },
    {
      id: "ex-bi-4",
      productId: prodId,
      title: "Corrigir layout no Safari",
      description: "",
      priority: "medium" as const,
      status: "review" as const,
      storyPoints: 2,
      classification: "bug" as const,
      createdAt: now,
      archivedAt: null,
      completedAt: null
    },
    {
      id: "ex-bi-5",
      productId: prodId,
      title: "Configurar domínio e DNS",
      description: "",
      priority: "medium" as const,
      status: "done" as const,
      storyPoints: 1,
      classification: "task" as const,
      createdAt: now,
      archivedAt: null,
      completedAt: null
    },
    {
      id: "ex-bi-6",
      productId: prodId,
      title: "Refatorar módulo de autenticação",
      description: "Extrair lógica de auth em um serviço separado",
      priority: "high" as const,
      status: "todo" as const,
      storyPoints: 5,
      classification: "refactor" as const,
      createdAt: now,
      archivedAt: null,
      completedAt: null
    },
    {
      id: "ex-bi-7",
      productId: prodId,
      title: "Prototipar nova UI do checkout",
      description: "Explorar conceito de one-page checkout",
      priority: "low" as const,
      status: "done" as const,
      storyPoints: 3,
      classification: "idea" as const,
      createdAt: now,
      archivedAt: null,
      completedAt: null
    }
  ];

  const tasks = [
    { id: "ex-t-1", backlogItemId: "ex-bi-1", title: "Criar modelo de carrinho", status: "todo" as const, assignedTo: "" },
    { id: "ex-t-2", backlogItemId: "ex-bi-1", title: "API de adicionar/remover item", status: "todo" as const, assignedTo: "" },
    { id: "ex-t-3", backlogItemId: "ex-bi-1", title: "Persistir carrinho no localStorage", status: "todo" as const, assignedTo: "" },
    { id: "ex-t-4", backlogItemId: "ex-bi-2", title: "Criar conta Stripe sandbox", status: "doing" as const, assignedTo: "" },
    { id: "ex-t-5", backlogItemId: "ex-bi-2", title: "Implementar webhook de pagamento", status: "todo" as const, assignedTo: "" },
    { id: "ex-t-6", backlogItemId: "ex-bi-3", title: "Grid responsivo de cards", status: "done" as const, assignedTo: "" },
    { id: "ex-t-7", backlogItemId: "ex-bi-3", title: "Filtro por categoria", status: "doing" as const, assignedTo: "" },
    { id: "ex-t-8", backlogItemId: "ex-bi-5", title: "DNS apontado para Vercel", status: "done" as const, assignedTo: "" },
    { id: "ex-t-9", backlogItemId: "ex-bi-6", title: "Extrair serviço de auth", status: "todo" as const, assignedTo: "" },
    { id: "ex-t-10", backlogItemId: "ex-bi-6", title: "Testes unitários de auth", status: "todo" as const, assignedTo: "" },
    { id: "ex-t-11", backlogItemId: "ex-bi-6", title: "Migrar páginas para novo serviço", status: "todo" as const, assignedTo: "" }
  ];

  const links: Link[] = [
    { id: "ex-l-1", backlogItemId: "ex-bi-1", url: "https://www.figma.com/file/carrinho-prototype", visitedAt: null },
    { id: "ex-l-2", backlogItemId: "ex-bi-2", url: "https://docs.stripe.com/api", visitedAt: null },
    { id: "ex-l-3", backlogItemId: "ex-bi-3", url: "https://www.figma.com/file/product-grid", visitedAt: null },
    { id: "ex-l-4", backlogItemId: "ex-bi-6", url: "https://github.com/org/repo/auth-service", visitedAt: null },
    { id: "ex-l-5", backlogItemId: "ex-bi-7", url: "https://www.figma.com/file/checkout-redesign", visitedAt: null }
  ];

  return {
    products: [
      {
        id: prodId,
        name: "Sistema de E-Commerce",
        description: "Plataforma completa de vendas online com carrinho, pagamento e gestão de produtos",
        createdAt: now,
        status: "in_progress",
        showPriority: true,
        category: "development",
        autoArchiveDays: null,
        autoPasteLinks: true,
        autoPasteImages: true,
        showReview: true,
        archivedAt: null
      }
    ],
    backlogItems: items,
    tasks,
    links,
    comments: [],
    images: [],
    estimations: []
  };
}
